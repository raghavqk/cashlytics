// IndexedDB Database Manager for Financial Portfolio
class PortfolioDatabase {
    constructor() {
        this.dbName = 'CashlyticsPortfolioDB';
        this.dbVersion = 1;
        this.db = null;
    }

    // Initialize database
    async init() {
        return new Promise((resolve, reject) => {
            const request = indexedDB.open(this.dbName, this.dbVersion);

            request.onerror = () => reject(request.error);
            request.onsuccess = () => {
                this.db = request.result;
                resolve(this.db);
            };

            request.onupgradeneeded = (event) => {
                const db = event.target.result;

                // Portfolio object store
                if (!db.objectStoreNames.contains('portfolios')) {
                    const portfolioStore = db.createObjectStore('portfolios', { keyPath: 'id', autoIncrement: true });
                    portfolioStore.createIndex('userName', 'userName', { unique: false });
                }

                // Accounts object store
                if (!db.objectStoreNames.contains('accounts')) {
                    const accountStore = db.createObjectStore('accounts', { keyPath: 'id', autoIncrement: true });
                    accountStore.createIndex('portfolioId', 'portfolioId', { unique: false });
                    accountStore.createIndex('type', 'type', { unique: false });
                }

                // Transactions object store
                if (!db.objectStoreNames.contains('transactions')) {
                    const transactionStore = db.createObjectStore('transactions', { keyPath: 'id', autoIncrement: true });
                    transactionStore.createIndex('portfolioId', 'portfolioId', { unique: false });
                    transactionStore.createIndex('accountId', 'accountId', { unique: false });
                    transactionStore.createIndex('date', 'date', { unique: false });
                }

                // EMIs object store
                if (!db.objectStoreNames.contains('emis')) {
                    const emiStore = db.createObjectStore('emis', { keyPath: 'id', autoIncrement: true });
                    emiStore.createIndex('portfolioId', 'portfolioId', { unique: false });
                    emiStore.createIndex('accountId', 'accountId', { unique: false });
                }

                // Investments object store
                if (!db.objectStoreNames.contains('investments')) {
                    const investmentStore = db.createObjectStore('investments', { keyPath: 'id', autoIncrement: true });
                    investmentStore.createIndex('portfolioId', 'portfolioId', { unique: false });
                    investmentStore.createIndex('type', 'type', { unique: false });
                }

                // Schemes object store
                if (!db.objectStoreNames.contains('schemes')) {
                    const schemeStore = db.createObjectStore('schemes', { keyPath: 'id', autoIncrement: true });
                    schemeStore.createIndex('portfolioId', 'portfolioId', { unique: false });
                    schemeStore.createIndex('type', 'type', { unique: false });
                }
            };
        });
    }

    // Get current portfolio
    async getPortfolio() {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['portfolios'], 'readonly');
            const store = transaction.objectStore('portfolios');
            const request = store.getAll();

            request.onsuccess = () => {
                const portfolios = request.result;
                if (portfolios.length === 0) {
                    resolve(null);
                } else {
                    // Get the first portfolio (can be extended to support multiple)
                    this.getFullPortfolio(portfolios[0].id).then(resolve).catch(reject);
                }
            };

            request.onerror = () => reject(request.error);
        });
    }

    // Get full portfolio with all related data
    async getFullPortfolio(portfolioId) {
        return new Promise((resolve, reject) => {
            const portfolioData = {};

            // Get portfolio
            const portfolioTx = this.db.transaction(['portfolios'], 'readonly');
            const portfolioStore = portfolioTx.objectStore('portfolios');
            const portfolioReq = portfolioStore.get(portfolioId);

            portfolioReq.onsuccess = async () => {
                portfolioData.portfolio = portfolioReq.result;

                try {
                    portfolioData.accounts = await this.getAllAccounts(portfolioId);
                    portfolioData.transactions = await this.getAllTransactions(portfolioId);
                    portfolioData.emis = await this.getAllEMIs(portfolioId);
                    portfolioData.investments = await this.getAllInvestments(portfolioId);
                    portfolioData.schemes = await this.getAllSchemes(portfolioId);

                    // Convert to legacy format for compatibility
                    const legacy = {
                        id: portfolioData.portfolio.id,
                        userName: portfolioData.portfolio.userName,
                        accounts: portfolioData.accounts,
                        transactions: portfolioData.transactions,
                        emis: portfolioData.emis || [],
                        investments: portfolioData.investments || [],
                        schemes: portfolioData.schemes || []
                    };

                    resolve(legacy);
                } catch (error) {
                    reject(error);
                }
            };

            portfolioReq.onerror = () => reject(portfolioReq.error);
        });
    }

    // Save portfolio
    async savePortfolio(portfolio) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['portfolios', 'accounts', 'transactions', 'emis', 'investments', 'schemes'], 'readwrite');

            // Save portfolio
            const portfolioStore = transaction.objectStore('portfolios');
            let portfolioData = {
                id: portfolio.id || 1,
                userName: portfolio.userName,
                createdAt: portfolio.createdAt || new Date().toISOString(),
                updatedAt: new Date().toISOString()
            };

            const portfolioReq = portfolio.id 
                ? portfolioStore.put(portfolioData)
                : portfolioStore.add(portfolioData);

            portfolioReq.onsuccess = async () => {
                const portfolioId = portfolioReq.result || portfolio.id;

                try {
                    // Clear existing data
                    await this.clearPortfolioData(portfolioId);

                    // Save accounts
                    if (portfolio.accounts) {
                        for (const account of portfolio.accounts) {
                            account.portfolioId = portfolioId;
                            await this.saveAccount(account);
                        }
                    }

                    // Save transactions
                    if (portfolio.transactions) {
                        for (const transaction of portfolio.transactions) {
                            transaction.portfolioId = portfolioId;
                            await this.saveTransaction(transaction);
                        }
                    }

                    // Save EMIs
                    if (portfolio.emis) {
                        for (const emi of portfolio.emis) {
                            emi.portfolioId = portfolioId;
                            await this.saveEMI(emi);
                        }
                    }

                    // Save investments
                    if (portfolio.investments) {
                        for (const investment of portfolio.investments) {
                            investment.portfolioId = portfolioId;
                            await this.saveInvestment(investment);
                        }
                    }

                    // Save schemes
                    if (portfolio.schemes) {
                        for (const scheme of portfolio.schemes) {
                            scheme.portfolioId = portfolioId;
                            await this.saveScheme(scheme);
                        }
                    }

                    resolve(portfolioId);
                } catch (error) {
                    reject(error);
                }
            };

            portfolioReq.onerror = () => reject(portfolioReq.error);
        });
    }

    // Account operations
    async getAllAccounts(portfolioId) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['accounts'], 'readonly');
            const store = transaction.objectStore('accounts');
            const index = store.index('portfolioId');
            const request = index.getAll(portfolioId);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async saveAccount(account) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['accounts'], 'readwrite');
            const store = transaction.objectStore('accounts');
            const request = account.id ? store.put(account) : store.add(account);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async deleteAccount(accountId) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['accounts'], 'readwrite');
            const store = transaction.objectStore('accounts');
            const request = store.delete(accountId);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    // Transaction operations
    async getAllTransactions(portfolioId) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['transactions'], 'readonly');
            const store = transaction.objectStore('transactions');
            const index = store.index('portfolioId');
            const request = index.getAll(portfolioId);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async saveTransaction(transaction) {
        return new Promise((resolve, reject) => {
            const transactionObj = this.db.transaction(['transactions'], 'readwrite');
            const store = transactionObj.objectStore('transactions');
            transaction.date = transaction.date || new Date().toISOString();
            const request = transaction.id ? store.put(transaction) : store.add(transaction);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async deleteTransaction(transactionId) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['transactions'], 'readwrite');
            const store = transaction.objectStore('transactions');
            const request = store.delete(transactionId);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    // EMI operations
    async getAllEMIs(portfolioId) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['emis'], 'readonly');
            const store = transaction.objectStore('emis');
            const index = store.index('portfolioId');
            const request = index.getAll(portfolioId);

            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    }

    async saveEMI(emi) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['emis'], 'readwrite');
            const store = transaction.objectStore('emis');
            const request = emi.id ? store.put(emi) : store.add(emi);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async deleteEMI(emiId) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['emis'], 'readwrite');
            const store = transaction.objectStore('emis');
            const request = store.delete(emiId);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    // Investment operations
    async getAllInvestments(portfolioId) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['investments'], 'readonly');
            const store = transaction.objectStore('investments');
            const index = store.index('portfolioId');
            const request = index.getAll(portfolioId);

            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    }

    async saveInvestment(investment) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['investments'], 'readwrite');
            const store = transaction.objectStore('investments');
            const request = investment.id ? store.put(investment) : store.add(investment);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async deleteInvestment(investmentId) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['investments'], 'readwrite');
            const store = transaction.objectStore('investments');
            const request = store.delete(investmentId);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    // Scheme operations
    async getAllSchemes(portfolioId) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['schemes'], 'readonly');
            const store = transaction.objectStore('schemes');
            const index = store.index('portfolioId');
            const request = index.getAll(portfolioId);

            request.onsuccess = () => resolve(request.result || []);
            request.onerror = () => reject(request.error);
        });
    }

    async saveScheme(scheme) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['schemes'], 'readwrite');
            const store = transaction.objectStore('schemes');
            const request = scheme.id ? store.put(scheme) : store.add(scheme);

            request.onsuccess = () => resolve(request.result);
            request.onerror = () => reject(request.error);
        });
    }

    async deleteScheme(schemeId) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['schemes'], 'readwrite');
            const store = transaction.objectStore('schemes');
            const request = store.delete(schemeId);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    // Clear all portfolio data
    async clearPortfolioData(portfolioId) {
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['accounts', 'transactions', 'emis', 'investments', 'schemes'], 'readwrite');

            // Clear accounts
            const accountStore = transaction.objectStore('accounts');
            const accountIndex = accountStore.index('portfolioId');
            accountIndex.openCursor(IDBKeyRange.only(portfolioId)).onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    cursor.delete();
                    cursor.continue();
                }
            };

            // Clear transactions
            const transactionStore = transaction.objectStore('transactions');
            const transactionIndex = transactionStore.index('portfolioId');
            transactionIndex.openCursor(IDBKeyRange.only(portfolioId)).onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    cursor.delete();
                    cursor.continue();
                }
            };

            // Clear EMIs
            const emiStore = transaction.objectStore('emis');
            const emiIndex = emiStore.index('portfolioId');
            emiIndex.openCursor(IDBKeyRange.only(portfolioId)).onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    cursor.delete();
                    cursor.continue();
                }
            };

            // Clear investments
            const investmentStore = transaction.objectStore('investments');
            const investmentIndex = investmentStore.index('portfolioId');
            investmentIndex.openCursor(IDBKeyRange.only(portfolioId)).onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    cursor.delete();
                    cursor.continue();
                }
            };

            // Clear schemes
            const schemeStore = transaction.objectStore('schemes');
            const schemeIndex = schemeStore.index('portfolioId');
            schemeIndex.openCursor(IDBKeyRange.only(portfolioId)).onsuccess = (event) => {
                const cursor = event.target.result;
                if (cursor) {
                    cursor.delete();
                    cursor.continue();
                }
            };

            transaction.oncomplete = () => resolve();
            transaction.onerror = () => reject(transaction.error);
        });
    }

    // Delete entire portfolio
    async deletePortfolio(portfolioId) {
        await this.clearPortfolioData(portfolioId);
        return new Promise((resolve, reject) => {
            const transaction = this.db.transaction(['portfolios'], 'readwrite');
            const store = transaction.objectStore('portfolios');
            const request = store.delete(portfolioId);

            request.onsuccess = () => resolve();
            request.onerror = () => reject(request.error);
        });
    }

    // Export portfolio data (for backup)
    async exportPortfolio() {
        const portfolio = await this.getPortfolio();
        return JSON.stringify(portfolio, null, 2);
    }

    // Import portfolio data (for restore)
    async importPortfolio(jsonData) {
        const portfolio = JSON.parse(jsonData);
        return await this.savePortfolio(portfolio);
    }
}

// Initialize database instance
const db = new PortfolioDatabase();



