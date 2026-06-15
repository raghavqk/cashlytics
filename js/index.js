// --- DOM ELEMENTS ---
const mainDashboard = document.getElementById('main-dashboard');
const setupModal = document.getElementById('setup-modal');
const addAccountModal = document.getElementById('add-account-modal');
const addEMIModal = document.getElementById('add-emi-modal');
const addInvestmentModal = document.getElementById('add-investment-modal');
const addSchemeModal = document.getElementById('add-scheme-modal');

// Setup Modal Elements
const step1 = document.getElementById('step-1');
const step2 = document.getElementById('step-2');
const nextStep1Btn = document.getElementById('next-step-1');
const setupForm = document.getElementById('setup-form');
const userNameInput = document.getElementById('user-name');

// Account Type Specific Fields (Setup)
const setupAccountTypeSelect = document.getElementById('account-type');
const setupSavingsFields = document.getElementById('setup-savings-fields');
const setupLoanFields = document.getElementById('setup-loan-fields');

// Add Account Modal Elements
const addAccountBtn = document.getElementById('add-account-btn');
const closeAddAccountModalBtn = document.getElementById('close-add-account-modal');
const addAccountForm = document.getElementById('add-account-form');
const newAccountTypeSelect = document.getElementById('new-account-type');
const newSavingsFields = document.getElementById('new-savings-fields');
const newLoanFields = document.getElementById('new-loan-fields');

// EMI Modal Elements
const addEMIBtn = document.getElementById('add-emi-btn');
const closeAddEMIModalBtn = document.getElementById('close-add-emi-modal');
const addEMIForm = document.getElementById('add-emi-form');
const emiAccountSelect = document.getElementById('emi-account');

// Investment Modal Elements
const addInvestmentBtn = document.getElementById('add-investment-btn');
const closeAddInvestmentModalBtn = document.getElementById('close-add-investment-modal');
const addInvestmentForm = document.getElementById('add-investment-form');
const investmentAccountSelect = document.getElementById('investment-account');
const investmentTypeSelect = document.getElementById('investment-type');
const sipFields = document.getElementById('sip-fields');

// Scheme Modal Elements
const addSchemeBtn = document.getElementById('add-scheme-btn');
const closeAddSchemeModalBtn = document.getElementById('close-add-scheme-modal');
const addSchemeForm = document.getElementById('add-scheme-form');
const schemeAccountSelect = document.getElementById('scheme-account');

// EMI/Interest Action Elements
const applyEMIButton = document.getElementById('apply-emi-button');
const applyInterestButton = document.getElementById('apply-interest-button');

// Dashboard Elements
const welcomeMessage = document.getElementById('welcome-message');
const netWorthEl = document.getElementById('net-worth');
const totalAssetsEl = document.getElementById('total-assets');
const totalLiabilitiesEl = document.getElementById('total-liabilities');
const accountsList = document.getElementById('accounts-list');
const transactionList = document.getElementById('transaction-list'); // May be null, using separate lists now
const transactionForm = document.getElementById('transaction-form'); // May be null, using separate forms now
const transactionText = document.getElementById('transaction-text'); // May be null
const transactionAmount = document.getElementById('transaction-amount'); // May be null
const transactionType = document.getElementById('transaction-type'); // May be null
const transactionAccount = document.getElementById('transaction-account'); // May be null
const resetPortfolioBtn = document.getElementById('reset-portfolio-btn');

// New Lists
const emisList = document.getElementById('emis-list');
const investmentsList = document.getElementById('investments-list');
const schemesList = document.getElementById('schemes-list');

// Analytics Elements
const totalInvestmentsEl = document.getElementById('total-investments');
const monthlyEMIEl = document.getElementById('monthly-emi');
const schemesValueEl = document.getElementById('schemes-value');
const savingsRateEl = document.getElementById('savings-rate');

// Projections Elements
const projectionsList = document.getElementById('projections-list');
const applyMonthlyBtn = document.getElementById('apply-monthly-btn');

// --- GLOBAL STATE ---
let portfolio = null;
let dbInitialized = false;

// --- INITIALIZATION ---
async function init() {
    try {
        await db.init();
        dbInitialized = true;
        portfolio = await db.getPortfolio();
        
        if (portfolio) {
            // Migrate from localStorage if exists
            const oldPortfolio = localStorage.getItem('portfolio');
            if (oldPortfolio && !portfolio) {
                portfolio = JSON.parse(oldPortfolio);
                portfolio.id = 1;
                await db.savePortfolio(portfolio);
                localStorage.removeItem('portfolio');
            }
            showDashboard();
        } else {
            showSetup();
        }
    } catch (error) {
        console.error('Database initialization error:', error);
        // Fallback to localStorage
        const oldPortfolio = localStorage.getItem('portfolio');
        if (oldPortfolio) {
            portfolio = JSON.parse(oldPortfolio);
            showDashboard();
        } else {
            showSetup();
        }
    }
}

// --- UI CONTROL ---
function showDashboard() {
    if (setupModal) setupModal.style.display = 'none';
    if (mainDashboard) mainDashboard.classList.remove('d-none');
    updateUI();
}

function showSetup() {
    if (setupModal) setupModal.style.display = 'flex';
    if (mainDashboard) mainDashboard.classList.add('d-none');
}

// --- RENDERING ---
async function updateUI() {
    if (!portfolio) return;

    // Refresh portfolio from database
    if (dbInitialized) {
        portfolio = await db.getPortfolio();
    }

    if (!portfolio) return;

    // Clear previous state
    if (accountsList) accountsList.innerHTML = '';
    if (transactionList) transactionList.innerHTML = '';
    if (transactionAccount) transactionAccount.innerHTML = '';
    
    // Update EMI/Interest summary
    updateEMIInterestSummary();
    if (projectionsList) projectionsList.innerHTML = '';
    if (emisList) emisList.innerHTML = '';
    if (investmentsList) investmentsList.innerHTML = '';
    if (schemesList) schemesList.innerHTML = '';

    // Update Welcome Message
    if (welcomeMessage) welcomeMessage.textContent = `Welcome, ${portfolio.userName}!`;

    let netWorth = 0;
    let totalAssets = 0;
    let totalLiabilities = 0;
    let totalInvestmentsValue = 0;
    let totalMonthlyEMI = 0;
    let totalSchemesValue = 0;
    let totalIncome = 0;
    let totalExpenses = 0;

    // Render Accounts & Populate Dropdowns
    if (portfolio.accounts) {
        portfolio.accounts.forEach(acc => {
            // Create account card
            const accountEl = document.createElement('div');
            accountEl.classList.add('account-card', acc.type.toLowerCase().replace(' ', '-'));
            
            const balanceClass = acc.balance >= 0 ? 'positive' : 'negative';
            const icon = getAccountIcon(acc.type);

            accountEl.innerHTML = `
                <div class="account-details">
                    <div class="account-header">
                        <i class="${icon}"></i>
                        <div class="account-name">${acc.name} <small>(${acc.type})</small></div>
                    </div>
                </div>
                <div class="account-balance ${balanceClass}">₹${formatNumber(acc.balance)}</div>
            `;
            if (accountsList) accountsList.appendChild(accountEl);

        // Populate transaction account dropdown (if it exists)
        if (transactionAccount) {
            const option = document.createElement('option');
            option.value = acc.id;
            option.textContent = `${acc.name} (${acc.type})`;
            transactionAccount.appendChild(option);
        }

            // Populate EMI account dropdown
            if (acc.type !== 'Credit Card' && acc.type !== 'Loan') {
                if (emiAccountSelect) {
                    const emiOption = document.createElement('option');
                    emiOption.value = acc.id;
                    emiOption.textContent = `${acc.name}`;
                    emiAccountSelect.appendChild(emiOption);
                }

                // Populate investment account dropdown
                if (investmentAccountSelect) {
                    const invOption = document.createElement('option');
                    invOption.value = acc.id;
                    invOption.textContent = `${acc.name}`;
                    investmentAccountSelect.appendChild(invOption);
                }
                
                if (schemeAccountSelect) {
                    const schemeOption = document.createElement('option');
                    schemeOption.value = acc.id;
                    schemeOption.textContent = `${acc.name}`;
                    schemeAccountSelect.appendChild(schemeOption);
                }
            }

            // Update financial summaries
            if (acc.type === 'Credit Card' || acc.type === 'Loan') {
                totalLiabilities += Math.abs(acc.balance);
            } else {
                totalAssets += acc.balance;
            }

            // Render Projections
            if (acc.type === 'Savings' && acc.interestRate) {
                const monthlyInterest = (acc.balance * (acc.interestRate / 100)) / 12;
                const projectionEl = document.createElement('div');
                projectionEl.classList.add('projection-card');
                projectionEl.innerHTML = `
                    <div><strong>${acc.name}</strong> (Savings)</div>
                    <div>Monthly Interest: <span class="positive">+₹${formatNumber(monthlyInterest)}</span></div>
                `;
                if (projectionsList) projectionsList.appendChild(projectionEl);
            }
            if (acc.type === 'Loan' && acc.principal > 0) {
                const monthlyEMI = calculateEMI(acc.principal, acc.interestRate, acc.tenure);
                const projectionEl = document.createElement('div');
                projectionEl.classList.add('projection-card');
                projectionEl.innerHTML = `
                     <div><strong>${acc.name}</strong> (Loan)</div>
                     <div>Monthly EMI: <span class="negative">-₹${formatNumber(monthlyEMI)}</span></div>
                `;
                if (projectionsList) projectionsList.appendChild(projectionEl);
            }
        });
    }

    // Render EMIs
    if (portfolio.emis && portfolio.emis.length > 0) {
        portfolio.emis.forEach(emi => {
            const monthlyEMI = calculateEMI(emi.principal, emi.interestRate, emi.tenure);
            totalMonthlyEMI += monthlyEMI;
            
            const emiEl = document.createElement('div');
            emiEl.classList.add('financial-item-card');
            const account = portfolio.accounts?.find(a => a.id === emi.accountId);
            emiEl.innerHTML = `
                <div class="financial-item-header">
                    <div>
                        <strong>${emi.name}</strong>
                        <small>${account ? account.name : 'N/A'}</small>
                    </div>
                    <button class="delete-item-btn" onclick="deleteEMI(${emi.id})">&times;</button>
                </div>
                <div class="financial-item-details">
                    <div>Principal: ₹${formatNumber(emi.principal)}</div>
                    <div>Monthly EMI: <span class="negative">₹${formatNumber(monthlyEMI)}</span></div>
                    <div>Interest Rate: ${emi.interestRate}% p.a.</div>
                    <div>Tenure: ${emi.tenure} years</div>
                </div>
            `;
            if (emisList) emisList.appendChild(emiEl);
        });
    } else {
        if (emisList) emisList.innerHTML = '<div class="empty-state">No EMIs added yet. Click + to add one.</div>';
    }

    // Render Investments
    if (portfolio.investments && portfolio.investments.length > 0) {
        portfolio.investments.forEach(inv => {
            const profit = inv.currentValue - inv.investmentAmount;
            const profitPercent = (profit / inv.investmentAmount) * 100;
            totalInvestmentsValue += inv.currentValue;
            
            const invEl = document.createElement('div');
            invEl.classList.add('financial-item-card');
            const account = portfolio.accounts?.find(a => a.id === inv.accountId);
            invEl.innerHTML = `
                <div class="financial-item-header">
                    <div>
                        <strong>${inv.name}</strong>
                        <small>${inv.type} • ${account ? account.name : 'N/A'}</small>
                    </div>
                    <button class="delete-item-btn" onclick="deleteInvestment(${inv.id})">&times;</button>
                </div>
                <div class="financial-item-details">
                    <div>Invested: ₹${formatNumber(inv.investmentAmount)}</div>
                    <div>Current Value: ₹${formatNumber(inv.currentValue)}</div>
                    <div>${profit >= 0 ? 'Profit' : 'Loss'}: <span class="${profit >= 0 ? 'positive' : 'negative'}">₹${formatNumber(Math.abs(profit))} (${profitPercent.toFixed(2)}%)</span></div>
                    ${inv.monthlySIP ? `<div>Monthly SIP: ₹${formatNumber(inv.monthlySIP)}</div>` : ''}
                </div>
            `;
            if (investmentsList) investmentsList.appendChild(invEl);
        });
    } else {
        if (investmentsList) investmentsList.innerHTML = '<div class="empty-state">No investments added yet. Click + to add one.</div>';
    }

    // Render Schemes
    if (portfolio.schemes && portfolio.schemes.length > 0) {
        portfolio.schemes.forEach(scheme => {
            totalSchemesValue += scheme.amount;
            
            const schemeEl = document.createElement('div');
            schemeEl.classList.add('financial-item-card');
            const account = portfolio.accounts?.find(a => a.id === scheme.accountId);
            schemeEl.innerHTML = `
                <div class="financial-item-header">
                    <div>
                        <strong>${scheme.name}</strong>
                        <small>${scheme.type} • ${account ? account.name : 'N/A'}</small>
                    </div>
                    <button class="delete-item-btn" onclick="deleteScheme(${scheme.id})">&times;</button>
                </div>
                <div class="financial-item-details">
                    <div>Value: ₹${formatNumber(scheme.amount)}</div>
                    ${scheme.interestRate ? `<div>Interest Rate: ${scheme.interestRate}%</div>` : ''}
                    ${scheme.startDate ? `<div>Started: ${formatDate(scheme.startDate)}</div>` : ''}
                    ${scheme.maturityDate ? `<div>Maturity: ${formatDate(scheme.maturityDate)}</div>` : ''}
                </div>
            `;
            if (schemesList) schemesList.appendChild(schemeEl);
        });
    } else {
        if (schemesList) schemesList.innerHTML = '<div class="empty-state">No schemes added yet. Click + to add one.</div>';
    }

    // Calculate transactions summary
    if (portfolio.transactions) {
        portfolio.transactions.forEach(t => {
            if (t.amount > 0) totalIncome += t.amount;
            else totalExpenses += Math.abs(t.amount);
        });
    }

    netWorth = totalAssets + totalSchemesValue + totalInvestmentsValue - totalLiabilities;

    // Update summary values (include investments and schemes in total assets)
    const totalAssetsWithInvestments = totalAssets + totalInvestmentsValue + totalSchemesValue;
    if (netWorthEl) netWorthEl.textContent = `₹${formatNumber(netWorth)}`;
    if (totalAssetsEl) totalAssetsEl.textContent = `+₹${formatNumber(totalAssetsWithInvestments)}`;
    if (totalLiabilitiesEl) totalLiabilitiesEl.textContent = `-₹${formatNumber(totalLiabilities)}`;

    // Update Analytics
    if (totalInvestmentsEl) totalInvestmentsEl.textContent = `₹${formatNumber(totalInvestmentsValue)}`;
    if (monthlyEMIEl) monthlyEMIEl.textContent = `₹${formatNumber(totalMonthlyEMI)}`;
    if (schemesValueEl) schemesValueEl.textContent = `₹${formatNumber(totalSchemesValue)}`;
    
    const savingsRate = totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome * 100).toFixed(1) : 0;
    if (savingsRateEl) savingsRateEl.textContent = `${savingsRate}%`;

    // Render Transactions
    renderTransactions();
    renderIncomeExpenseSeparately();
    updateCategoryFilter();
    
    // Populate account dropdowns for column forms
    populateAccountDropdowns();
}

// Compute and show Monthly EMI and Expected Returns summary
function updateEMIInterestSummary() {
    const totalMonthlyEmiEl = document.getElementById('total-monthly-emi');
    const totalMonthlyReturnsEl = document.getElementById('total-monthly-returns');

    if (!portfolio) return;

    // Total EMIs from defined EMIs
    let totalMonthlyEMI = 0;
    if (portfolio.emis && portfolio.emis.length > 0) {
        portfolio.emis.forEach(emi => {
            totalMonthlyEMI += calculateEMI(emi.principal, emi.interestRate, emi.tenure);
        });
    }

    // Expected monthly returns from Savings interest + Schemes interest
    let totalMonthlyReturns = 0;
    if (portfolio.accounts) {
        portfolio.accounts.forEach(acc => {
            if (acc.type === 'Savings' && acc.interestRate && acc.balance > 0) {
                totalMonthlyReturns += (acc.balance * (acc.interestRate / 100)) / 12;
            }
        });
    }
    if (portfolio.schemes) {
        portfolio.schemes.forEach(s => {
            if (s.interestRate && s.amount > 0) {
                totalMonthlyReturns += (s.amount * (s.interestRate / 100)) / 12;
            }
        });
    }

    if (totalMonthlyEmiEl) totalMonthlyEmiEl.textContent = `-₹${formatNumber(totalMonthlyEMI)}`;
    if (totalMonthlyReturnsEl) totalMonthlyReturnsEl.textContent = `+₹${formatNumber(totalMonthlyReturns)}`;
}

// Render Income and Expenses Separately
function renderIncomeExpenseSeparately() {
    const incomeList = document.getElementById('income-list');
    const expenseList = document.getElementById('expense-list');
    
    if (!incomeList || !expenseList) return;
    
    incomeList.innerHTML = '';
    expenseList.innerHTML = '';
    
    if (!portfolio.transactions || portfolio.transactions.length === 0) {
        incomeList.innerHTML = '<li class="list-item">No income transactions yet.</li>';
        expenseList.innerHTML = '<li class="list-item">No expense transactions yet.</li>';
        return;
    }
    
    const incomes = portfolio.transactions.filter(t => t.amount > 0)
        .sort((a, b) => new Date(b.date || b.id) - new Date(a.date || a.id));
    const expenses = portfolio.transactions.filter(t => t.amount < 0)
        .sort((a, b) => new Date(b.date || b.id) - new Date(a.date || a.id));
    
    if (incomes.length === 0) {
        incomeList.innerHTML = '<li class="list-item">No income transactions yet.</li>';
    } else {
        incomes.forEach(t => addTransactionDOM(t, true, incomeList));
    }
    
    if (expenses.length === 0) {
        expenseList.innerHTML = '<li class="list-item">No expense transactions yet.</li>';
    } else {
        expenses.forEach(t => addTransactionDOM(t, true, expenseList));
    }
}

// Populate Account Dropdowns
function populateAccountDropdowns() {
    const incomeAccount = document.getElementById('income-account');
    const expenseAccount = document.getElementById('expense-account');
    
    if (incomeAccount) {
        incomeAccount.innerHTML = '<option value="">Select Account</option>';
        if (portfolio && portfolio.accounts) {
            portfolio.accounts.forEach(acc => {
                if (acc.type !== 'Credit Card' && acc.type !== 'Loan') {
                    const option = document.createElement('option');
                    option.value = acc.id;
                    option.textContent = acc.name;
                    incomeAccount.appendChild(option);
                }
            });
        }
    }
    
    if (expenseAccount) {
        expenseAccount.innerHTML = '<option value="">Select Account</option>';
        if (portfolio && portfolio.accounts) {
            portfolio.accounts.forEach(acc => {
                const option = document.createElement('option');
                option.value = acc.id;
                option.textContent = acc.name;
                expenseAccount.appendChild(option);
            });
        }
    }
}

// Column Button Handlers
const addInvestmentBtnColumn = document.getElementById('add-investment-btn-column');
const addSchemeBtnColumn = document.getElementById('add-scheme-btn-column');
const addEMIBtnColumn = document.getElementById('add-emi-btn-column');

if (addInvestmentBtnColumn) {
    addInvestmentBtnColumn.addEventListener('click', () => {
        if (investmentAccountSelect) investmentAccountSelect.innerHTML = '<option value="">Select Account</option>';
        if (portfolio && portfolio.accounts) {
            portfolio.accounts.forEach(acc => {
                if (acc.type !== 'Credit Card' && acc.type !== 'Loan') {
                    const option = document.createElement('option');
                    option.value = acc.id;
                    option.textContent = acc.name;
                    investmentAccountSelect.appendChild(option);
                }
            });
        }
        if (addInvestmentModal) addInvestmentModal.style.display = 'flex';
    });
}

if (addSchemeBtnColumn) {
    addSchemeBtnColumn.addEventListener('click', () => {
        if (schemeAccountSelect) schemeAccountSelect.innerHTML = '<option value="">Select Account</option>';
        if (portfolio && portfolio.accounts) {
            portfolio.accounts.forEach(acc => {
                if (acc.type !== 'Credit Card' && acc.type !== 'Loan') {
                    const option = document.createElement('option');
                    option.value = acc.id;
                    option.textContent = acc.name;
                    schemeAccountSelect.appendChild(option);
                }
            });
        }
        if (addSchemeModal) addSchemeModal.style.display = 'flex';
    });
}

if (addEMIBtnColumn) {
    addEMIBtnColumn.addEventListener('click', () => {
        if (emiAccountSelect) emiAccountSelect.innerHTML = '<option value="">Select Account</option>';
        if (portfolio && portfolio.accounts) {
            portfolio.accounts.forEach(acc => {
                if (acc.type !== 'Credit Card' && acc.type !== 'Loan') {
                    const option = document.createElement('option');
                    option.value = acc.id;
                    option.textContent = acc.name;
                    emiAccountSelect.appendChild(option);
                }
            });
        }
        if (addEMIModal) addEMIModal.style.display = 'flex';
    });
}

// Income Form Handler
const incomeForm = document.getElementById('income-form');
if (incomeForm) {
    incomeForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const text = document.getElementById('income-text').value.trim();
        const amount = parseFloat(document.getElementById('income-amount').value);
        const accountId = parseInt(document.getElementById('income-account').value);
        const category = document.getElementById('income-category').value || 'Salary';
        const dateInput = document.getElementById('income-date').value;

        if (!text || isNaN(amount) || !accountId) {
            alert('Please fill all required fields.');
            return;
        }

        const transaction = {
            id: Date.now(),
            text,
            amount: Math.abs(amount),
            accountId,
            category,
            date: dateInput ? new Date(dateInput).toISOString() : new Date().toISOString()
        };

        const account = portfolio.accounts.find(acc => acc.id === accountId);
        if (account) {
            account.balance += transaction.amount;
        }

        if (!portfolio.transactions) portfolio.transactions = [];
        portfolio.transactions.push(transaction);
        await savePortfolio();
        updateUI();

        incomeForm.reset();
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('income-date').value = today;
    });
}

// Expense Form Handler
const expenseForm = document.getElementById('expense-form');
if (expenseForm) {
    expenseForm.addEventListener('submit', async function(e) {
        e.preventDefault();
        const text = document.getElementById('expense-text').value.trim();
        const amount = parseFloat(document.getElementById('expense-amount').value);
        const accountId = parseInt(document.getElementById('expense-account').value);
        const category = document.getElementById('expense-category').value || 'Other';
        const dateInput = document.getElementById('expense-date').value;

        if (!text || isNaN(amount) || !accountId) {
            alert('Please fill all required fields.');
            return;
        }

        const transaction = {
            id: Date.now(),
            text,
            amount: -Math.abs(amount),
            accountId,
            category,
            date: dateInput ? new Date(dateInput).toISOString() : new Date().toISOString()
        };

        const account = portfolio.accounts.find(acc => acc.id === accountId);
        if (account) {
            account.balance += transaction.amount;
        }

        if (!portfolio.transactions) portfolio.transactions = [];
        portfolio.transactions.push(transaction);
        await savePortfolio();
        updateUI();

        expenseForm.reset();
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('expense-date').value = today;
    });
}

// Set default dates
if (document.getElementById('income-date')) {
    document.getElementById('income-date').value = new Date().toISOString().split('T')[0];
}
if (document.getElementById('expense-date')) {
    document.getElementById('expense-date').value = new Date().toISOString().split('T')[0];
}

// Show/Hide Form Functions
window.showIncomeForm = function() {
    const form = document.getElementById('income-form');
    if (form) {
        form.style.display = form.style.display === 'none' ? 'flex' : 'flex';
    }
};

window.showExpenseForm = function() {
    const form = document.getElementById('expense-form');
    if (form) {
        form.style.display = form.style.display === 'none' ? 'flex' : 'flex';
    }
};

// Render Transactions with Filtering (for old transaction list if it exists)
function renderTransactions() {
    if (!transactionList) return; // Skip if old transaction list doesn't exist
    
    transactionList.innerHTML = '';
    
    if (!portfolio.transactions || portfolio.transactions.length === 0) {
        transactionList.innerHTML = '<li class="list-item">No transactions yet.</li>';
        return;
    }
    
    const filterType = document.getElementById('filter-type')?.value || 'all';
    const filterCategory = document.getElementById('filter-category')?.value || 'all';
    
    let filtered = portfolio.transactions.slice()
        .sort((a, b) => new Date(b.date || b.id) - new Date(a.date || a.id));
    
    if (filterType !== 'all') {
        filtered = filtered.filter(t => 
            filterType === 'income' ? t.amount > 0 : t.amount < 0
        );
    }
    
    if (filterCategory !== 'all') {
        filtered = filtered.filter(t => (t.category || 'Other') === filterCategory);
    }
    
    if (filtered.length === 0) {
        transactionList.innerHTML = '<li class="list-item">No transactions match the filters.</li>';
        return;
    }
    
    filtered.forEach(t => addTransactionDOM(t, true));
}

// Update Category Filter Options
function updateCategoryFilter() {
    const filterCategory = document.getElementById('filter-category');
    if (!filterCategory) return;
    
    const currentValue = filterCategory.value;
    filterCategory.innerHTML = '<option value="all">All Categories</option>';
    
    if (portfolio.transactions) {
        const categories = [...new Set(portfolio.transactions.map(t => t.category || 'Other'))];
        categories.sort().forEach(cat => {
            const option = document.createElement('option');
            option.value = cat;
            option.textContent = cat;
            filterCategory.appendChild(option);
        });
    }
    
    filterCategory.value = currentValue || 'all';
}

// Filter Event Handlers
const filterType = document.getElementById('filter-type');
const filterCategory = document.getElementById('filter-category');
const clearFiltersBtn = document.getElementById('clear-filters');

if (filterType) {
    filterType.addEventListener('change', renderTransactions);
}
if (filterCategory) {
    filterCategory.addEventListener('change', renderTransactions);
}
if (clearFiltersBtn) {
    clearFiltersBtn.addEventListener('click', () => {
        if (filterType) filterType.value = 'all';
        if (filterCategory) filterCategory.value = 'all';
        renderTransactions();
    });
}

// Set default date to today
const transactionDateInput = document.getElementById('transaction-date');
if (transactionDateInput) {
    const today = new Date().toISOString().split('T')[0];
    transactionDateInput.value = today;
}

function addTransactionDOM(transaction, filtered = false, targetList = null) {
    const sign = transaction.amount < 0 ? '-' : '+';
    const item = document.createElement('li');
    item.classList.add('list-item', transaction.amount < 0 ? 'minus' : 'plus');
    const account = portfolio.accounts?.find(acc => acc.id === transaction.accountId);
    const category = transaction.category || 'Other';
    const categoryIcon = getCategoryIcon(category);

    item.innerHTML = `
        <div class="transaction-details">
            <span><i class="${categoryIcon}"></i> ${transaction.text} <span class="category-badge">${category}</span></span>
            <small>${account ? account.name : 'Unknown Account'} • ${formatDate(transaction.date || transaction.id)}</small>
        </div>
        <span class="amount">${sign}₹${formatNumber(Math.abs(transaction.amount))}</span>
        <button class="delete-btn" onclick="removeTransaction(${transaction.id})">x</button>
    `;
    
    if (!filtered) {
        item.setAttribute('data-type', transaction.amount < 0 ? 'expense' : 'income');
        item.setAttribute('data-category', category);
    }
    
    const listToUse = targetList || transactionList;
    if (listToUse) {
        listToUse.appendChild(item);
    }
}

function getCategoryIcon(category) {
    const icons = {
        'Food & Dining': 'fas fa-utensils',
        'Shopping': 'fas fa-shopping-bag',
        'Transport': 'fas fa-car',
        'Bills & Utilities': 'fas fa-file-invoice',
        'Entertainment': 'fas fa-film',
        'Healthcare': 'fas fa-heartbeat',
        'Education': 'fas fa-graduation-cap',
        'Salary': 'fas fa-money-bill-wave',
        'Investment': 'fas fa-chart-line',
        'Business': 'fas fa-briefcase',
        'Other': 'fas fa-circle'
    };
    return icons[category] || 'fas fa-circle';
}

function getAccountIcon(type) {
    const icons = {
        'Savings': 'fas fa-piggy-bank',
        'Current': 'fas fa-wallet',
        'Credit Card': 'fas fa-credit-card',
        'Loan': 'fas fa-hand-holding-usd',
        'Investment': 'fas fa-chart-line',
        'Cash': 'fas fa-money-bill-wave',
        'Other': 'fas fa-university'
    };
    return icons[type] || 'fas fa-university';
}

// --- EVENT HANDLERS ---

// Setup Process
if (nextStep1Btn) {
    nextStep1Btn.addEventListener('click', () => {
        const userName = userNameInput?.value.trim();
        if (userName) {
            if (step1) step1.classList.add('d-none');
            if (step2) step2.classList.remove('d-none');
        } else {
            alert('Please enter your name.');
        }
    });
}

function toggleConditionalFields(selectElement, savingsContainer, loanContainer) {
    if (!selectElement || !savingsContainer || !loanContainer) return;
    const selectedType = selectElement.value;
    savingsContainer.classList.toggle('d-none', selectedType !== 'Savings');
    loanContainer.classList.toggle('d-none', selectedType !== 'Loan');
}

if (setupAccountTypeSelect && setupSavingsFields && setupLoanFields) {
    setupAccountTypeSelect.addEventListener('change', () => toggleConditionalFields(setupAccountTypeSelect, setupSavingsFields, setupLoanFields));
}
if (newAccountTypeSelect && newSavingsFields && newLoanFields) {
    newAccountTypeSelect.addEventListener('change', () => toggleConditionalFields(newAccountTypeSelect, newSavingsFields, newLoanFields));
}

if (investmentTypeSelect && sipFields) {
    investmentTypeSelect.addEventListener('change', () => {
        sipFields.classList.toggle('d-none', investmentTypeSelect.value !== 'SIP');
    });
}

if (setupForm) {
    setupForm.addEventListener('submit', handleSetupFormSubmit);
}
async function handleSetupFormSubmit(e) {
    e.preventDefault();
    const userName = userNameInput.value.trim();
    const accountName = document.getElementById('account-name').value.trim();
    const accountType = document.getElementById('account-type').value;
    let initialBalance = parseFloat(document.getElementById('initial-balance').value);

    if (!accountName) {
        alert('Please enter an account name.');
        return;
    }

    const newAccount = createAccountObject(Date.now(), accountName, accountType, initialBalance);
    
    portfolio = {
        id: 1,
        userName: userName,
        accounts: [newAccount],
        transactions: [],
        emis: [],
        investments: [],
        schemes: []
    };

    await savePortfolio();
    showDashboard();
}

// Add New Account
if (addAccountBtn) {
    addAccountBtn.addEventListener('click', () => {
        // Refresh account dropdowns
        if (emiAccountSelect) emiAccountSelect.innerHTML = '<option value="">Select Account</option>';
        if (investmentAccountSelect) investmentAccountSelect.innerHTML = '<option value="">Select Account</option>';
        if (schemeAccountSelect) schemeAccountSelect.innerHTML = '<option value="">Select Account</option>';
        
        if (portfolio && portfolio.accounts) {
            portfolio.accounts.forEach(acc => {
                if (acc.type !== 'Credit Card' && acc.type !== 'Loan') {
                    if (emiAccountSelect) {
                        const emiOption = document.createElement('option');
                        emiOption.value = acc.id;
                        emiOption.textContent = acc.name;
                        emiAccountSelect.appendChild(emiOption);
                    }
                    
                    if (investmentAccountSelect) {
                        const invOption = document.createElement('option');
                        invOption.value = acc.id;
                        invOption.textContent = acc.name;
                        investmentAccountSelect.appendChild(invOption);
                    }
                    
                    if (schemeAccountSelect) {
                        const schemeOption = document.createElement('option');
                        schemeOption.value = acc.id;
                        schemeOption.textContent = acc.name;
                        schemeAccountSelect.appendChild(schemeOption);
                    }
                }
            });
        }
        if (addAccountModal) addAccountModal.style.display = 'flex';
    });
}

if (closeAddAccountModalBtn) {
    closeAddAccountModalBtn.addEventListener('click', () => {
        if (addAccountModal) addAccountModal.style.display = 'none';
    });
}

if (addAccountForm) {
    addAccountForm.addEventListener('submit', handleAddAccountFormSubmit);
}

async function handleAddAccountFormSubmit(e) {
    e.preventDefault();
    const accountName = document.getElementById('new-account-name').value.trim();
    const accountType = document.getElementById('new-account-type').value;
    let initialBalance = parseFloat(document.getElementById('new-initial-balance').value);
    
    if (!accountName) {
        alert('Please enter an account name.');
        return;
    }

    const newAccount = createAccountObject(Date.now(), accountName, accountType, initialBalance, 'new');
    
    if (!portfolio.accounts) portfolio.accounts = [];
    portfolio.accounts.push(newAccount);
    await savePortfolio();
    updateUI();
    addAccountModal.style.display = 'none';
    addAccountForm.reset();
}

// Add EMI
if (addEMIBtn) {
    addEMIBtn.addEventListener('click', () => {
        if (emiAccountSelect) emiAccountSelect.innerHTML = '<option value="">Select Account</option>';
        if (portfolio && portfolio.accounts) {
            portfolio.accounts.forEach(acc => {
                if (acc.type !== 'Credit Card' && acc.type !== 'Loan') {
                    if (emiAccountSelect) {
                        const option = document.createElement('option');
                        option.value = acc.id;
                        option.textContent = acc.name;
                        emiAccountSelect.appendChild(option);
                    }
                }
            });
        }
        if (addEMIModal) addEMIModal.style.display = 'flex';
    });
}

if (closeAddEMIModalBtn) {
    closeAddEMIModalBtn.addEventListener('click', () => {
        if (addEMIModal) addEMIModal.style.display = 'none';
    });
}

if (addEMIForm) {
    addEMIForm.addEventListener('submit', handleAddEMIFormSubmit);
}

async function handleAddEMIFormSubmit(e) {
    e.preventDefault();
    const emi = {
        id: Date.now(),
        name: document.getElementById('emi-name').value.trim(),
        accountId: parseInt(document.getElementById('emi-account').value),
        principal: parseFloat(document.getElementById('emi-principal').value),
        interestRate: parseFloat(document.getElementById('emi-interest-rate').value),
        tenure: parseFloat(document.getElementById('emi-tenure').value),
        startDate: document.getElementById('emi-start-date').value
    };

    if (!portfolio.emis) portfolio.emis = [];
    portfolio.emis.push(emi);
    await savePortfolio();
    updateUI();
    addEMIModal.style.display = 'none';
    addEMIForm.reset();
}

// Delete EMI
window.deleteEMI = async function(emiId) {
    if (!confirm('Are you sure you want to delete this EMI?')) return;
    portfolio.emis = portfolio.emis.filter(e => e.id !== emiId);
    await savePortfolio();
    updateUI();
};

// Add Investment
if (addInvestmentBtn) {
    addInvestmentBtn.addEventListener('click', () => {
        if (investmentAccountSelect) investmentAccountSelect.innerHTML = '<option value="">Select Account</option>';
        if (portfolio && portfolio.accounts) {
            portfolio.accounts.forEach(acc => {
                if (acc.type !== 'Credit Card' && acc.type !== 'Loan') {
                    if (investmentAccountSelect) {
                        const option = document.createElement('option');
                        option.value = acc.id;
                        option.textContent = acc.name;
                        investmentAccountSelect.appendChild(option);
                    }
                }
            });
        }
        if (addInvestmentModal) addInvestmentModal.style.display = 'flex';
    });
}

if (closeAddInvestmentModalBtn) {
    closeAddInvestmentModalBtn.addEventListener('click', () => {
        if (addInvestmentModal) addInvestmentModal.style.display = 'none';
    });
}

if (addInvestmentForm) {
    addInvestmentForm.addEventListener('submit', handleAddInvestmentFormSubmit);
}

async function handleAddInvestmentFormSubmit(e) {
    e.preventDefault();
    const investment = {
        id: Date.now(),
        name: document.getElementById('investment-name').value.trim(),
        type: document.getElementById('investment-type').value,
        investmentAmount: parseFloat(document.getElementById('investment-amount').value),
        currentValue: parseFloat(document.getElementById('investment-current-value').value),
        accountId: parseInt(document.getElementById('investment-account').value),
        purchaseDate: document.getElementById('investment-date').value
    };

    if (investmentTypeSelect.value === 'SIP') {
        investment.monthlySIP = parseFloat(document.getElementById('sip-amount').value) || 0;
    }

    // Investment is an asset - optionally track source account but don't subtract
    // Investments are separate assets that add to portfolio value
    if (!portfolio.investments) portfolio.investments = [];
    portfolio.investments.push(investment);
    await savePortfolio();
    updateUI();
    addInvestmentModal.style.display = 'none';
    addInvestmentForm.reset();
}

// Delete Investment
window.deleteInvestment = async function(investmentId) {
    if (!confirm('Are you sure you want to delete this investment?')) return;
    portfolio.investments = portfolio.investments.filter(i => i.id !== investmentId);
    await savePortfolio();
    updateUI();
};

// Add Scheme
if (addSchemeBtn) {
    addSchemeBtn.addEventListener('click', () => {
        if (schemeAccountSelect) schemeAccountSelect.innerHTML = '<option value="">Select Account</option>';
        if (portfolio && portfolio.accounts) {
            portfolio.accounts.forEach(acc => {
                if (acc.type !== 'Credit Card' && acc.type !== 'Loan') {
                    if (schemeAccountSelect) {
                        const option = document.createElement('option');
                        option.value = acc.id;
                        option.textContent = acc.name;
                        schemeAccountSelect.appendChild(option);
                    }
                }
            });
        }
        if (addSchemeModal) addSchemeModal.style.display = 'flex';
    });
}

if (closeAddSchemeModalBtn) {
    closeAddSchemeModalBtn.addEventListener('click', () => {
        if (addSchemeModal) addSchemeModal.style.display = 'none';
    });
}

if (addSchemeForm) {
    addSchemeForm.addEventListener('submit', handleAddSchemeFormSubmit);
}

async function handleAddSchemeFormSubmit(e) {
    e.preventDefault();
    const scheme = {
        id: Date.now(),
        name: document.getElementById('scheme-name').value.trim(),
        type: document.getElementById('scheme-type').value,
        amount: parseFloat(document.getElementById('scheme-amount').value),
        accountId: parseInt(document.getElementById('scheme-account').value),
        interestRate: parseFloat(document.getElementById('scheme-interest-rate').value) || 0,
        startDate: document.getElementById('scheme-start-date').value,
        maturityDate: document.getElementById('scheme-maturity-date').value || null
    };

    // Schemes are assets - optionally track source account but don't subtract
    // Schemes are separate assets that add to portfolio value
    if (!portfolio.schemes) portfolio.schemes = [];
    portfolio.schemes.push(scheme);
    await savePortfolio();
    updateUI();
    addSchemeModal.style.display = 'none';
    addSchemeForm.reset();
}

// Delete Scheme
window.deleteScheme = async function(schemeId) {
    if (!confirm('Are you sure you want to delete this scheme?')) return;
    portfolio.schemes = portfolio.schemes.filter(s => s.id !== schemeId);
    await savePortfolio();
    updateUI();
};

// Add Transaction (old form - kept for backward compatibility if form exists)
if (transactionForm) {
    transactionForm.addEventListener('submit', addTransaction);
}
async function addTransaction(e) {
    if (!transactionForm || !transactionText || !transactionAmount || !transactionAccount) return;
    
    e.preventDefault();
    const text = transactionText.value.trim();
    let amount = parseFloat(transactionAmount.value);
    const type = transactionType?.value || 'income';
    const accountId = parseInt(transactionAccount.value);
    const category = document.getElementById('transaction-category')?.value || 'Other';
    const dateInput = document.getElementById('transaction-date')?.value;

    if (text === '' || isNaN(amount)) {
        alert('Please add a description and amount.');
        return;
    }
    if(!accountId){
        alert('Please select an account.');
        return;
    }

    // Adjust amount based on type (expense should be negative)
    if (type === 'expense' && amount > 0) {
        amount *= -1;
    }
    if(type === 'income' && amount < 0) {
        amount = Math.abs(amount);
    }

    const transaction = {
        id: Date.now(),
        text,
        amount,
        accountId,
        category,
        date: dateInput ? new Date(dateInput).toISOString() : new Date().toISOString()
    };

    // Update account balance
    const account = portfolio.accounts.find(acc => acc.id === accountId);
    if(account){
        account.balance += amount;
    }

    if (!portfolio.transactions) portfolio.transactions = [];
    portfolio.transactions.push(transaction);
    await savePortfolio();
    updateUI();

    if (transactionText) transactionText.value = '';
    if (transactionAmount) transactionAmount.value = '';
    const dateEl = document.getElementById('transaction-date');
    if (dateEl) dateEl.value = '';
    const categoryEl = document.getElementById('transaction-category');
    if (categoryEl) categoryEl.value = 'Other';
}

// Remove Transaction
window.removeTransaction = async function(id) {
    const transaction = portfolio.transactions.find(t => t.id === id);
    if (!transaction) return;
    
    // Revert account balance
    const account = portfolio.accounts.find(acc => acc.id === transaction.accountId);
    if(account){
        account.balance -= transaction.amount;
    }
    
    portfolio.transactions = portfolio.transactions.filter(t => t.id !== id);
    await savePortfolio();
    updateUI();
};

// Reset Portfolio
if (resetPortfolioBtn) {
    resetPortfolioBtn.addEventListener('click', async () => {
        if (confirm('Are you sure you want to reset your entire portfolio? This action cannot be undone.')) {
            if (dbInitialized && portfolio && portfolio.id) {
                await db.deletePortfolio(portfolio.id);
            } else {
                localStorage.removeItem('portfolio');
            }
            portfolio = null;
            showSetup();
        }
    });
}

const exportJsonBtn = document.getElementById('export-json-btn');
const exportImageBtn = document.getElementById('export-image-btn');
const portfolioReport = document.getElementById('portfolio-report');
const reportContent = document.getElementById('report-content');

// Export JSON Data
if (exportJsonBtn) {
    exportJsonBtn.addEventListener('click', async () => {
    try {
        let data;
        if (dbInitialized) {
            data = await db.exportPortfolio();
        } else {
            data = JSON.stringify(portfolio, null, 2);
        }
        
        const blob = new Blob([data], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `cashlytics-portfolio-${new Date().toISOString().split('T')[0]}.json`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
        alert('Portfolio data exported successfully!');
    } catch (error) {
        console.error('Export error:', error);
        alert('Failed to export data. Please try again.');
    }
    });
}

// Export as Image with Charts
if (exportImageBtn) {
    exportImageBtn.addEventListener('click', async () => {
    try {
        if (!portfolio) {
            alert('No portfolio data to export!');
            return;
        }
        
        // Show loading
        if (exportImageBtn) {
            exportImageBtn.disabled = true;
            exportImageBtn.innerHTML = '<i class="fas fa-spinner fa-spin"></i> Generating...';
        }
        
        // Generate report HTML with charts
        await generatePortfolioReport();
        
        // Wait a bit for charts to render
        await new Promise(resolve => setTimeout(resolve, 1500));
        
        if (!portfolioReport) {
            throw new Error('Report container not found');
        }
        
        // Convert to image with optimized settings for legibility
        const canvas = await html2canvas(portfolioReport, {
            backgroundColor: '#ffffff',
            scale: 1.5,
            width: portfolioReport.scrollWidth,
            height: portfolioReport.scrollHeight,
            logging: false,
            useCORS: true,
            allowTaint: false
        });
        
        // Download image
        canvas.toBlob((blob) => {
            const url = URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `cashlytics-portfolio-report-${new Date().toISOString().split('T')[0]}.png`;
            document.body.appendChild(a);
            a.click();
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
            
            // Reset button
            if (exportImageBtn) {
                exportImageBtn.disabled = false;
                exportImageBtn.innerHTML = '<i class="fas fa-image"></i> Export as Image';
            }
            
            // Hide report after export
            if (portfolioReport) portfolioReport.style.display = 'none';
            
            alert('Portfolio report exported as image successfully!');
        }, 'image/png');
        
    } catch (error) {
        console.error('Image export error:', error);
        alert('Failed to export image. Please try again.');
        if (exportImageBtn) {
            exportImageBtn.disabled = false;
            exportImageBtn.innerHTML = '<i class="fas fa-image"></i> Export as Image';
        }
    }
    });
}

// Generate Portfolio Report HTML
async function generatePortfolioReport() {
    if (!portfolio || !portfolioReport || !reportContent) return;
    
    // Calculate totals
    let totalAssets = 0, totalLiabilities = 0, totalInvestments = 0, totalSchemes = 0;
    const accountTypes = {};
    const investmentTypes = {};
    const expenseCategories = {};
    let totalIncome = 0, totalExpenses = 0;
    
    if (portfolio.accounts) {
        portfolio.accounts.forEach(acc => {
            if (acc.type === 'Credit Card' || acc.type === 'Loan') {
                totalLiabilities += Math.abs(acc.balance);
            } else {
                totalAssets += acc.balance;
            }
            accountTypes[acc.type] = (accountTypes[acc.type] || 0) + Math.abs(acc.balance);
        });
    }
    
    if (portfolio.investments) {
        portfolio.investments.forEach(inv => {
            totalInvestments += inv.currentValue;
            investmentTypes[inv.type] = (investmentTypes[inv.type] || 0) + inv.currentValue;
        });
    }
    
    if (portfolio.schemes) {
        portfolio.schemes.forEach(scheme => {
            totalSchemes += scheme.amount;
        });
    }
    
    if (portfolio.transactions) {
        portfolio.transactions.forEach(t => {
            if (t.amount > 0) {
                totalIncome += t.amount;
            } else {
                totalExpenses += Math.abs(t.amount);
                const category = t.category || 'Other';
                expenseCategories[category] = (expenseCategories[category] || 0) + Math.abs(t.amount);
            }
        });
    }
    
    const netWorth = totalAssets + totalInvestments + totalSchemes - totalLiabilities;
    
    // Generate HTML - optimized for image export with proper sizing
    reportContent.innerHTML = `
        <div style="font-family: 'Roboto', sans-serif; color: #333; max-width: 1200px; margin: 0 auto; padding: 40px;">
            <div style="text-align: center; margin-bottom: 50px; padding-bottom: 30px; border-bottom: 4px solid #5e17eb;">
                <h1 style="color: #5e17eb; margin-bottom: 15px; font-size: 2.5rem; font-weight: 700;">Cashlytics Portfolio Report</h1>
                <p style="color: #666; font-size: 1.3rem; margin-bottom: 8px;">${portfolio.userName}'s Financial Portfolio</p>
                <p style="color: #999; font-size: 1rem;">Generated on ${new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</p>
            </div>
            
            <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 25px; margin-bottom: 50px;">
                <div style="background: linear-gradient(135deg, #28a745, #20c997); padding: 30px; border-radius: 15px; color: white; text-align: center; box-shadow: 0 5px 20px rgba(0,0,0,0.1);">
                    <h3 style="margin: 0 0 15px 0; font-size: 1.1rem; font-weight: 600;">Net Worth</h3>
                    <p style="margin: 0; font-size: 2.2rem; font-weight: bold;">₹${formatNumber(netWorth)}</p>
                </div>
                <div style="background: linear-gradient(135deg, #17a2b8, #138496); padding: 30px; border-radius: 15px; color: white; text-align: center; box-shadow: 0 5px 20px rgba(0,0,0,0.1);">
                    <h3 style="margin: 0 0 15px 0; font-size: 1.1rem; font-weight: 600;">Total Assets</h3>
                    <p style="margin: 0; font-size: 2.2rem; font-weight: bold;">₹${formatNumber(totalAssets + totalInvestments + totalSchemes)}</p>
                </div>
                <div style="background: linear-gradient(135deg, #dc3545, #c82333); padding: 30px; border-radius: 15px; color: white; text-align: center; box-shadow: 0 5px 20px rgba(0,0,0,0.1);">
                    <h3 style="margin: 0 0 15px 0; font-size: 1.1rem; font-weight: 600;">Liabilities</h3>
                    <p style="margin: 0; font-size: 2.2rem; font-weight: bold;">₹${formatNumber(totalLiabilities)}</p>
                </div>
            </div>
            
            <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 40px; margin-bottom: 50px;">
                <div style="background: #f8f9fa; padding: 30px; border-radius: 15px;">
                    <h3 style="color: #5e17eb; margin-bottom: 25px; font-size: 1.4rem; font-weight: 600;">Account Distribution</h3>
                    <canvas id="accountChart" style="max-height: 350px;"></canvas>
                </div>
                <div style="background: #f8f9fa; padding: 30px; border-radius: 15px;">
                    <h3 style="color: #5e17eb; margin-bottom: 25px; font-size: 1.4rem; font-weight: 600;">Investment Types</h3>
                    <canvas id="investmentChart" style="max-height: 350px;"></canvas>
                </div>
            </div>
            
            <div style="background: #f8f9fa; padding: 30px; border-radius: 15px; margin-bottom: 50px;">
                <h3 style="color: #5e17eb; margin-bottom: 25px; font-size: 1.4rem; font-weight: 600;">Income vs Expenses</h3>
                <canvas id="incomeExpenseChart" style="max-height: 400px;"></canvas>
            </div>
            
            <div style="background: white; padding: 30px; border-radius: 15px; box-shadow: 0 2px 10px rgba(0,0,0,0.1);">
                <h3 style="color: #5e17eb; margin-bottom: 25px; font-size: 1.4rem; font-weight: 600;">Financial Holdings Summary</h3>
                <table style="width: 100%; border-collapse: collapse; font-size: 1.1rem;">
                    <thead>
                        <tr style="background: #5e17eb; color: white;">
                            <th style="padding: 15px; text-align: left; font-size: 1.1rem; font-weight: 600;">Category</th>
                            <th style="padding: 15px; text-align: right; font-size: 1.1rem; font-weight: 600;">Amount</th>
                        </tr>
                    </thead>
                    <tbody>
                        <tr style="border-bottom: 2px solid #eee;">
                            <td style="padding: 15px; font-size: 1rem;">Total Income</td>
                            <td style="padding: 15px; text-align: right; color: #28a745; font-weight: bold; font-size: 1.1rem;">₹${formatNumber(totalIncome)}</td>
                        </tr>
                        <tr style="border-bottom: 2px solid #eee;">
                            <td style="padding: 15px; font-size: 1rem;">Total Expenses</td>
                            <td style="padding: 15px; text-align: right; color: #dc3545; font-weight: bold; font-size: 1.1rem;">₹${formatNumber(totalExpenses)}</td>
                        </tr>
                        <tr style="border-bottom: 2px solid #eee;">
                            <td style="padding: 15px; font-size: 1rem;">Savings Rate</td>
                            <td style="padding: 15px; text-align: right; font-weight: bold; font-size: 1.1rem;">${totalIncome > 0 ? ((totalIncome - totalExpenses) / totalIncome * 100).toFixed(1) : 0}%</td>
                        </tr>
                        <tr style="border-bottom: 2px solid #eee;">
                            <td style="padding: 15px; font-size: 1rem;">Total Investments</td>
                            <td style="padding: 15px; text-align: right; font-weight: bold; font-size: 1.1rem;">₹${formatNumber(totalInvestments)}</td>
                        </tr>
                        <tr style="border-bottom: 2px solid #eee;">
                            <td style="padding: 15px; font-size: 1rem;">Total Schemes</td>
                            <td style="padding: 15px; text-align: right; font-weight: bold; font-size: 1.1rem;">₹${formatNumber(totalSchemes)}</td>
                        </tr>
                        <tr style="background: #f8f9fa;">
                            <td style="padding: 15px; font-size: 1.1rem; font-weight: 700;">Net Worth</td>
                            <td style="padding: 15px; text-align: right; color: #5e17eb; font-weight: bold; font-size: 1.3rem;">₹${formatNumber(netWorth)}</td>
                        </tr>
                    </tbody>
                </table>
            </div>
        </div>
    `;
    
    // Show the report
    portfolioReport.style.display = 'block';
    
    // Create charts
    setTimeout(() => {
        createReportCharts(accountTypes, investmentTypes, totalIncome, totalExpenses, expenseCategories);
    }, 500);
}

// Create Charts for Report
function createReportCharts(accountTypes, investmentTypes, totalIncome, totalExpenses, expenseCategories) {
    // Account Distribution Chart
    const accountCtx = document.getElementById('accountChart');
    if (accountCtx) {
        new Chart(accountCtx, {
            type: 'doughnut',
            data: {
                labels: Object.keys(accountTypes),
                datasets: [{
                    data: Object.values(accountTypes),
                    backgroundColor: [
                        '#5e17eb', '#28a745', '#dc3545', '#17a2b8', '#ffc107', '#6c757d'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: { 
                        position: 'bottom',
                        labels: { font: { size: 14 } }
                    }
                }
            }
        });
    }
    
    // Investment Types Chart
    const investmentCtx = document.getElementById('investmentChart');
    if (investmentCtx && Object.keys(investmentTypes).length > 0) {
        new Chart(investmentCtx, {
            type: 'pie',
            data: {
                labels: Object.keys(investmentTypes),
                datasets: [{
                    data: Object.values(investmentTypes),
                    backgroundColor: [
                        '#17a2b8', '#28a745', '#ffc107', '#dc3545', '#5e17eb', '#6c757d', '#fd7e14'
                    ]
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: { 
                        position: 'bottom',
                        labels: { font: { size: 14 } }
                    }
                }
            }
        });
    }
    
    // Income vs Expenses Chart
    const incomeExpenseCtx = document.getElementById('incomeExpenseChart');
    if (incomeExpenseCtx) {
        new Chart(incomeExpenseCtx, {
            type: 'bar',
            data: {
                labels: ['Income', 'Expenses'],
                datasets: [{
                    label: 'Amount (₹)',
                    data: [totalIncome, totalExpenses],
                    backgroundColor: ['#28a745', '#dc3545']
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: true,
                plugins: {
                    legend: { display: false },
                    title: { display: false }
                },
                scales: {
                    y: {
                        beginAtZero: true,
                        ticks: { font: { size: 14 } }
                    },
                    x: {
                        ticks: { font: { size: 14 } }
                    }
                }
            }
        });
    }
}

// Apply Monthly Projections
if (applyMonthlyBtn) {
    applyMonthlyBtn.addEventListener('click', applyMonthlyChanges);
}
// Map dashboard action buttons to apply monthly logic as well
if (applyEMIButton) {
    applyEMIButton.addEventListener('click', applyMonthlyChanges);
}
if (applyInterestButton) {
    applyInterestButton.addEventListener('click', applyMonthlyChanges);
}
async function applyMonthlyChanges() {
    portfolio.accounts.forEach(acc => {
        if (acc.type === 'Savings' && acc.interestRate > 0) {
            const monthlyInterest = (acc.balance * (acc.interestRate / 100)) / 12;
            if (monthlyInterest > 0) {
                const transaction = {
                    id: Date.now() + Math.random(),
                    text: `Monthly Interest for ${acc.name}`,
                    amount: monthlyInterest,
                    accountId: acc.id,
                    date: new Date().toISOString()
                };
                acc.balance += monthlyInterest;
                if (!portfolio.transactions) portfolio.transactions = [];
                portfolio.transactions.push(transaction);
            }
        }
    });

    if (portfolio.emis) {
        portfolio.emis.forEach(emi => {
            const monthlyEMI = calculateEMI(emi.principal, emi.interestRate, emi.tenure);
            const account = portfolio.accounts.find(a => a.id === emi.accountId);
            if (account) {
                const transaction = {
                    id: Date.now() + Math.random(),
                    text: `EMI Payment: ${emi.name}`,
                    amount: -monthlyEMI,
                    accountId: emi.accountId,
                    date: new Date().toISOString()
                };
                account.balance -= monthlyEMI;
                if (!portfolio.transactions) portfolio.transactions = [];
                portfolio.transactions.push(transaction);
            }
        });
    }

    // Apply SIPs
    if (portfolio.investments) {
        portfolio.investments.forEach(inv => {
            if (inv.monthlySIP && inv.monthlySIP > 0) {
                const account = portfolio.accounts.find(a => a.id === inv.accountId);
                if (account && account.balance >= inv.monthlySIP) {
                    account.balance -= inv.monthlySIP;
                    inv.investmentAmount += inv.monthlySIP;
                    inv.currentValue += inv.monthlySIP; // Simplified - could add return calculation
                    const transaction = {
                        id: Date.now() + Math.random(),
                        text: `SIP: ${inv.name}`,
                        amount: -inv.monthlySIP,
                        accountId: inv.accountId,
                        date: new Date().toISOString()
                    };
                    if (!portfolio.transactions) portfolio.transactions = [];
                    portfolio.transactions.push(transaction);
                }
            }
        });
    }

    await savePortfolio();
    updateUI();
}

// --- UTILITY FUNCTIONS ---
async function savePortfolio() {
    if (dbInitialized) {
        await db.savePortfolio(portfolio);
    } else {
        localStorage.setItem('portfolio', JSON.stringify(portfolio));
    }
}

function createAccountObject(id, name, type, balance, prefix = 'setup') {
    const account = { id, name, type, balance };
    
    if (type === 'Loan') {
        account.balance = -Math.abs(balance); // Loans are liabilities
        account.principal = Math.abs(balance);
        account.interestRate = parseFloat(document.getElementById(`${prefix}-loan-interest`)?.value) || 0;
        account.tenure = parseFloat(document.getElementById(`${prefix}-loan-tenure`)?.value) || 0;
    }
    if (type === 'Savings') {
        account.interestRate = parseFloat(document.getElementById(`${prefix}-savings-interest`)?.value) || 0;
    }
     if (type === 'Credit Card') {
        account.balance = -Math.abs(balance); // Credit Card balances are liabilities
    }

    return account;
}

function calculateEMI(principal, annualRate, years) {
    if (annualRate <= 0 || years <= 0) return 0;
    const monthlyRate = annualRate / 12 / 100;
    const months = years * 12;
    const emi = (principal * monthlyRate * Math.pow(1 + monthlyRate, months)) / (Math.pow(1 + monthlyRate, months) - 1);
    return emi;
}

function formatNumber(num) {
    return Math.abs(num).toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g, ',');
}

function formatDate(dateString) {
    if (!dateString) return 'N/A';
    try {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-IN', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
        return dateString;
    }
}

// Close modals on outside click
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) {
        e.target.style.display = 'none';
    }
});

// --- RUN ON STARTUP ---
// Wait for DOM and ensure database is loaded
if (typeof db !== 'undefined') {
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        // DOM already loaded
        setTimeout(init, 100); // Small delay to ensure all scripts are loaded
    }
} else {
    // Database not loaded yet, wait a bit
    setTimeout(() => {
        if (typeof db !== 'undefined') {
            init();
        } else {
            console.error('Database class not found. Make sure database.js is loaded before index.js');
            // Fallback: try to show setup anyway
            if (typeof showSetup === 'function') showSetup();
        }
    }, 500);
}
