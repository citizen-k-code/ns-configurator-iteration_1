
class TelecomConfigurator {
    constructor() {
        this.data = null;
        this.state = {
            internet: {
                enabled: false,
                selectedTier: 1
            },
            mobile: {
                enabled: false,
                simcards: []
            }
        };
        this.init();
    }

    async init() {
        await this.loadData();
        this.setupEventListeners();
        this.updateCostSummary();
    }

    async loadData() {
        try {
            const response = await fetch('./data.json');
            this.data = await response.json();
        } catch (error) {
            console.error('Error loading data:', error);
        }
    }

    setupEventListeners() {
        // Internet toggle
        const internetToggle = document.getElementById('internet-toggle');
        internetToggle.addEventListener('change', (e) => {
            this.toggleProduct('internet', e.target.checked);
        });

        // Mobile toggle
        const mobileToggle = document.getElementById('mobile-toggle');
        mobileToggle.addEventListener('change', (e) => {
            this.toggleProduct('mobile', e.target.checked);
        });

        // Add simcard button
        const addSimcardBtn = document.getElementById('add-simcard-btn');
        addSimcardBtn.addEventListener('click', () => {
            this.addSimcard();
        });
    }

    toggleProduct(productType, enabled) {
        this.state[productType].enabled = enabled;
        const content = document.getElementById(`${productType}-content`);
        
        if (enabled) {
            content.style.display = 'block';
            if (productType === 'internet') {
                this.renderInternetTiers();
                this.state.internet.selectedTier = this.data.products.internet.defaultTier;
                this.updateInternetInfo();
            } else if (productType === 'mobile') {
                this.state.mobile.simcards = [{
                    id: 1,
                    selectedTier: this.data.products.mobile.defaultTier
                }];
                this.renderMobileSimcards();
            }
        } else {
            content.style.display = 'none';
            if (productType === 'mobile') {
                this.state.mobile.simcards = [];
            }
        }
        
        this.updateCostSummary();
    }

    renderInternetTiers() {
        const tiersContainer = document.getElementById('internet-tiers');
        const tiers = this.data.products.internet.tiers;
        
        tiersContainer.innerHTML = tiers.map(tier => `
            <div class="tier-option ${tier.id === this.state.internet.selectedTier ? 'active' : ''}" 
                 onclick="app.selectInternetTier(${tier.id})">
                <div class="tier-title">${tier.title}</div>
                <div class="tier-subtitle">${tier.subtitle}</div>
            </div>
        `).join('');
    }

    selectInternetTier(tierId) {
        this.state.internet.selectedTier = tierId;
        this.renderInternetTiers();
        this.updateInternetInfo();
        this.updateCostSummary();
    }

    updateInternetInfo() {
        const tier = this.data.products.internet.tiers.find(t => t.id === this.state.internet.selectedTier);
        const infoContainer = document.getElementById('internet-info');
        
        const summaryItems = tier.summary.split(', ').map(item => `<li>${item}</li>`).join('');
        
        let priceHtml;
        if (tier.discountPrice) {
            priceHtml = `
                <div class="tier-price-container">
                    <div class="original-price">€ ${tier.price.toFixed(2).replace('.', ',')}</div>
                    <div class="discount-price">€ ${tier.discountPrice.toFixed(2).replace('.', ',')}/maand</div>
                    <div class="discount-info">${tier.discountInfo}</div>
                </div>
            `;
        } else {
            priceHtml = `<div class="tier-price">€ ${tier.price.toFixed(2).replace('.', ',')}/maand</div>`;
        }
        
        infoContainer.innerHTML = `
            <ul class="tier-details">
                ${summaryItems}
            </ul>
            ${priceHtml}
        `;
    }

    renderMobileSimcards() {
        const container = document.getElementById('simcards-container');
        const addBtn = document.getElementById('add-simcard-btn');
        
        container.innerHTML = this.state.mobile.simcards.map((simcard, index) => `
            <div class="simcard">
                <div class="simcard-header">
                    <div class="simcard-title">Simkaart ${index + 1}</div>
                    ${this.state.mobile.simcards.length > 1 && index > 0 ? `<button class="delete-simcard" onclick="app.deleteSimcard(${simcard.id})">🗑️</button>` : ''}
                </div>
                <div class="tier-selector">
                    ${this.data.products.mobile.tiers.map(tier => `
                        <div class="tier-option ${tier.id === simcard.selectedTier ? 'active' : ''}" 
                             onclick="app.selectMobileTier(${simcard.id}, ${tier.id})">
                            <div class="tier-title">${tier.title}</div>
                            ${tier.subtitle ? `<div class="tier-subtitle">${tier.subtitle}</div>` : ''}
                        </div>
                    `).join('')}
                </div>
                <div class="tier-info">
                    ${this.getMobileTierInfo(simcard.selectedTier, index)}
                </div>
            </div>
        `).join('');
        
        // Update add button text and state
        const simcardCount = this.state.mobile.simcards.length;
        const maxSimcards = this.data.products.mobile.maxSimcards;
        
        if (simcardCount >= maxSimcards) {
            addBtn.style.display = 'none';
        } else {
            addBtn.style.display = 'block';
            addBtn.textContent = `➕ Voeg ${simcardCount + 1}e simkaart toe`;
        }
    }

    getMobileTierInfo(tierId, simcardIndex = 0) {
        const tier = this.data.products.mobile.tiers.find(t => t.id === tierId);
        const summaryItems = tier.summary.split(', ').map(item => `<li>${item}</li>`).join('');
        
        let priceHtml;
        // Only apply mobile discount to simcard 2 and beyond (simcardIndex >= 1)
        if (tier.discountPrice && simcardIndex >= 1) {
            priceHtml = `
                <div class="tier-price-container">
                    <div class="original-price">€ ${tier.price.toFixed(2).replace('.', ',')}</div>
                    <div class="discount-price">€ ${tier.discountPrice.toFixed(2).replace('.', ',')}/maand</div>
                    <div class="discount-info">${tier.discountInfo}</div>
                </div>
            `;
        } else {
            priceHtml = `<div class="tier-price">€ ${tier.price.toFixed(2).replace('.', ',')}/maand</div>`;
        }
        
        return `
            <ul class="tier-details">
                ${summaryItems}
            </ul>
            ${priceHtml}
        `;
    }

    selectMobileTier(simcardId, tierId) {
        const simcard = this.state.mobile.simcards.find(s => s.id === simcardId);
        if (simcard) {
            simcard.selectedTier = tierId;
            this.renderMobileSimcards();
            this.updateCostSummary();
        }
    }

    addSimcard() {
        if (this.state.mobile.simcards.length < this.data.products.mobile.maxSimcards) {
            const newId = Math.max(...this.state.mobile.simcards.map(s => s.id)) + 1;
            this.state.mobile.simcards.push({
                id: newId,
                selectedTier: this.data.products.mobile.defaultTier
            });
            this.renderMobileSimcards();
            this.updateCostSummary();
        }
    }

    deleteSimcard(simcardId) {
        this.state.mobile.simcards = this.state.mobile.simcards.filter(s => s.id !== simcardId);
        this.renderMobileSimcards();
        this.updateCostSummary();
    }

    calculateTotal() {
        let total = 0;
        let totalDiscount = 0;
        
        // Internet cost
        if (this.state.internet.enabled) {
            const internetTier = this.data.products.internet.tiers.find(t => t.id === this.state.internet.selectedTier);
            if (internetTier.discountPrice) {
                total += internetTier.discountPrice;
                totalDiscount += internetTier.price - internetTier.discountPrice;
            } else {
                total += internetTier.price;
            }
        }
        
        // Mobile costs
        if (this.state.mobile.enabled) {
            this.state.mobile.simcards.forEach((simcard, index) => {
                const mobileTier = this.data.products.mobile.tiers.find(t => t.id === simcard.selectedTier);
                // Only apply mobile discount to simcard 2 and beyond (index >= 1)
                if (mobileTier.discountPrice && index >= 1) {
                    total += mobileTier.discountPrice;
                    totalDiscount += mobileTier.price - mobileTier.discountPrice;
                } else {
                    total += mobileTier.price;
                }
            });
        }
        
        return { total, totalDiscount };
    }

    updateCostSummary() {
        const { total, totalDiscount } = this.calculateTotal();
        const hasDiscounts = totalDiscount > 0;
        const originalTotal = total + totalDiscount;
        
        // Update the monthly total
        document.getElementById('monthly-total').textContent = total.toFixed(2).replace('.', ',');
        
        // Update strikethrough price
        const strikethroughElement = document.getElementById('strikethrough-cost');
        if (hasDiscounts) {
            strikethroughElement.style.display = 'block';
            strikethroughElement.textContent = `€ ${originalTotal.toFixed(2).replace('.', ',')}`;
        } else {
            strikethroughElement.style.display = 'none';
        }
        
        // Update advantage block
        const advantageElement = document.getElementById('advantage-block');
        if (hasDiscounts) {
            advantageElement.style.display = 'block';
            document.getElementById('advantage-amount').textContent = totalDiscount.toFixed(2).replace('.', ',');
        } else {
            advantageElement.style.display = 'none';
        }
        
        // Calculate temporary promotions (all current discounts are temporary)
        const temporaryElement = document.getElementById('temporary-promotion');
        if (hasDiscounts) {
            temporaryElement.style.display = 'flex';
            document.getElementById('temporary-amount').textContent = `- € ${totalDiscount.toFixed(2).replace('.', ',')}`;
        } else {
            temporaryElement.style.display = 'none';
        }
        
        // Hide permanent promotion (no permanent discounts in current setup)
        const permanentElement = document.getElementById('permanent-promotion');
        permanentElement.style.display = 'none';
    }
}

// Initialize the app
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new TelecomConfigurator();
});
