class ExpenseTracker {
    constructor() {
        this.transactions = JSON.parse(localStorage.getItem('transactions')) || [];
        this.filters = {
            category: 'all',
            type: 'all'
        };
        this.categoryChart = null;
        this.monthlyChart = null;
        this.init();
    }

    init() {
        this.setupEventListeners();
        this.setDefaultDate();
        this.renderTransactions();
        this.updateSummary();
        this.initCharts();
    }

    setupEventListeners() {
        // Form submission
        document.getElementById('transaction-form').addEventListener('submit', (e) => {
            e.preventDefault();
            this.addTransaction();
        });

        // Filters
        document.getElementById('filter-category').addEventListener('change', (e) => {
            this.filters.category = e.target.value;
            this.renderTransactions();
        });

        document.getElementById('filter-type').addEventListener('change', (e) => {
            this.filters.type = e.target.value;
            this.renderTransactions();
        });

        document.getElementById('clear-filters').addEventListener('click', () => {
            this.clearFilters();
        });
    }

    setDefaultDate() {
        const today = new Date().toISOString().split('T')[0];
        document.getElementById('date').value = today;
    }

    addTransaction() {
        const description = document.getElementById('description').value.trim();
        const amount = parseFloat(document.getElementById('amount').value);
        const category = document.getElementById('category').value;
        const type = document.querySelector('input[name="type"]:checked').value;
        const date = document.getElementById('date').value;

        if (!description || !amount || !category || !date) {
            this.showNotification('Please fill in all fields', 'error');
            return;
        }

        const transaction = {
            id: Date.now(),
            description,
            amount,
            category,
            type,
            date,
            timestamp: new Date().toISOString()
        };

        this.transactions.unshift(transaction);
        this.saveTransactions();
        this.renderTransactions();
        this.updateSummary();
        this.updateCharts();
        this.resetForm();
        this.showNotification('Transaction added successfully!', 'success');
    }

    deleteTransaction(id) {
        if (confirm('Are you sure you want to delete this transaction?')) {
            this.transactions = this.transactions.filter(t => t.id !== id);
            this.saveTransactions();
            this.renderTransactions();
            this.updateSummary();
            this.updateCharts();
            this.showNotification('Transaction deleted', 'info');
        }
    }

    saveTransactions() {
        localStorage.setItem('transactions', JSON.stringify(this.transactions));
    }

    renderTransactions() {
        const transactionList = document.getElementById('transaction-list');
        const noTransactions = document.getElementById('no-transactions');
        
        let filteredTransactions = this.getFilteredTransactions();

        if (filteredTransactions.length === 0) {
            transactionList.innerHTML = '';
            noTransactions.style.display = 'block';
            return;
        }

        noTransactions.style.display = 'none';
        
        transactionList.innerHTML = filteredTransactions.map(transaction => `
            <div class="transaction-item ${transaction.type}">
                <div class="transaction-info">
                    <div class="transaction-header">
                        <span class="description">${this.escapeHtml(transaction.description)}</span>
                        <span class="amount ${transaction.type}">
                            ${transaction.type === 'expense' ? '-' : '+'}$${transaction.amount.toFixed(2)}
                        </span>
                    </div>
                    <div class="transaction-details">
                        <span class="category">${this.getCategoryIcon(transaction.category)} ${this.capitalizeFirst(transaction.category)}</span>
                        <span class="date">${this.formatDate(transaction.date)}</span>
                    </div>
                </div>
                <button class="delete-btn" onclick="tracker.deleteTransaction(${transaction.id})" title="Delete transaction">
                    ✕
                </button>
            </div>
        `).join('');
    }

    getFilteredTransactions() {
        return this.transactions.filter(transaction => {
            const categoryMatch = this.filters.category === 'all' || transaction.category === this.filters.category;
            const typeMatch = this.filters.type === 'all' || transaction.type === this.filters.type;
            return categoryMatch && typeMatch;
        });
    }

    clearFilters() {
        this.filters = { category: 'all', type: 'all' };
        document.getElementById('filter-category').value = 'all';
        document.getElementById('filter-type').value = 'all';
        this.renderTransactions();
    }

    updateSummary() {
        const income = this.transactions
            .filter(t => t.type === 'income')
            .reduce((sum, t) => sum + t.amount, 0);
        
        const expenses = this.transactions
            .filter(t => t.type === 'expense')
            .reduce((sum, t) => sum + t.amount, 0);
        
        const balance = income - expenses;

        document.getElementById('income').textContent = `$${income.toFixed(2)}`;
        document.getElementById('expenses').textContent = `$${expenses.toFixed(2)}`;
        document.getElementById('balance').textContent = `$${balance.toFixed(2)}`;
        
        // Update balance color
        const balanceElement = document.getElementById('balance');
        balanceElement.className = balance >= 0 ? 'positive' : 'negative';
    }

    initCharts() {
        this.updateCategoryChart();
        this.updateMonthlyChart();
    }

    updateCharts() {
        this.updateCategoryChart();
        this.updateMonthlyChart();
    }

    updateCategoryChart() {
        const ctx = document.getElementById('category-chart').getContext('2d');
        const categoryData = this.getCategoryData();

        if (this.categoryChart) {
            this.categoryChart.destroy();
        }

        this.categoryChart = new Chart(ctx, {
            type: 'doughnut',
            data: {
                labels: categoryData.labels,
                datasets: [{
                    data: categoryData.data,
                    backgroundColor: [
                        '#FF6384',
                        '#36A2EB',
                        '#FFCE56',
                        '#4BC0C0',
                        '#9966FF',
                        '#FF9F40',
                        '#FF6384',
                        '#C9CBCF',
                        '#4BC0C0',
                        '#FF6384'
                    ]
                }]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    },
                    title: {
                        display: true,
                        text: 'Expenses by Category'
                    }
                }
            }
        });
    }

    updateMonthlyChart() {
        const ctx = document.getElementById('monthly-chart').getContext('2d');
        const monthlyData = this.getMonthlyData();

        if (this.monthlyChart) {
            this.monthlyChart.destroy();
        }

        this.monthlyChart = new Chart(ctx, {
            type: 'bar',
            data: {
                labels: monthlyData.labels,
                datasets: [
                    {
                        label: 'Income',
                        data: monthlyData.income,
                        backgroundColor: '#4CAF50'
                    },
                    {
                        label: 'Expenses',
                        data: monthlyData.expenses,
                        backgroundColor: '#F44336'
                    }
                ]
            },
            options: {
                responsive: true,
                plugins: {
                    legend: {
                        position: 'bottom'
                    },
                    title: {
                        display: true,
                        text: 'Monthly Income vs Expenses'
                    }
                },
                scales: {
                    y: {
                        beginAtZero: true
                    }
                }
            }
        });
    }

    getCategoryData() {
        const expenses = this.transactions.filter(t => t.type === 'expense');
        const categoryTotals = {};

        expenses.forEach(transaction => {
            if (!categoryTotals[transaction.category]) {
                categoryTotals[transaction.category] = 0;
            }
            categoryTotals[transaction.category] += transaction.amount;
        });

        return {
            labels: Object.keys(categoryTotals).map(cat => this.capitalizeFirst(cat)),
            data: Object.values(categoryTotals)
        };
    }

    getMonthlyData() {
        const monthlyData = {
            labels: [],
            income: [],
            expenses: []
        };

        const last6Months = [];
        const today = new Date();
        
        for (let i = 5; i >= 0; i--) {
            const date = new Date(today.getFullYear(), today.getMonth() - i, 1);
            const monthYear = date.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
            last6Months.push(monthYear);
        }

        monthlyData.labels = last6Months;

        last6Months.forEach((monthYear, index) => {
            const monthStart = new Date(today.getFullYear(), today.getMonth() - (5 - index), 1);
            const monthEnd = new Date(today.getFullYear(), today.getMonth() - (5 - index) + 1, 0);
            
            const monthTransactions = this.transactions.filter(t => {
                const transactionDate = new Date(t.date);
                return transactionDate >= monthStart && transactionDate <= monthEnd;
            });

            const income = monthTransactions
                .filter(t => t.type === 'income')
                .reduce((sum, t) => sum + t.amount, 0);
            
            const expenses = monthTransactions
                .filter(t => t.type === 'expense')
                .reduce((sum, t) => sum + t.amount, 0);

            monthlyData.income.push(income);
            monthlyData.expenses.push(expenses);
        });

        return monthlyData;
    }

    resetForm() {
        document.getElementById('transaction-form').reset();
        this.setDefaultDate();
        document.querySelector('input[name="type"][value="expense"]').checked = true;
    }

    showNotification(message, type) {
        // Create notification element
        const notification = document.createElement('div');
        notification.className = `notification ${type}`;
        notification.textContent = message;
        
        // Add to page
        document.body.appendChild(notification);
        
        // Remove after 3 seconds
        setTimeout(() => {
            notification.remove();
        }, 3000);
    }

    // Utility functions
    getCategoryIcon(category) {
        const icons = {
            food: '🍔',
            transport: '🚗',
            shopping: '🛍️',
            entertainment: '🎬',
            bills: '📄',
            healthcare: '🏥',
            education: '📚',
            salary: '💼',
            freelance: '💻',
            investment: '📈',
            other: '📦'
        };
        return icons[category] || '📦';
    }

    capitalizeFirst(str) {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }

    formatDate(dateString) {
        const date = new Date(dateString);
        return date.toLocaleDateString('en-US', { 
            month: 'short', 
            day: 'numeric', 
            year: 'numeric' 
        });
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

// Initialize the app
const tracker = new ExpenseTracker();
