
class EntertainmentConfigurator {
    constructor() {
        this.data = null;
        this.state = {
            netflix: {
                enabled: false,
                selectedTier: 1
            },
            streamz: {
                enabled: false,
                selectedTier: 1
            },
            disney: {
                enabled: false
            },
            sport: {
                enabled: false
            },
            cinema: {
                enabled: false
            }
        };
        this.init();
    }

    async init() {
        await this.loadData();
        this.setupEventListeners();
        this.updateAllSubtitles();
        this.updateProductHeaderStates();
        this.updateCostSummary();
    }

    async loadData() {
        try {
            const response = await fetch('./entertainment-data.json');
            this.data = await response.json();
        } catch (error) {
            console.error('Error loading data:', error);
        }
    }

    setupEventListeners() {
        // Netflix toggle
        const netflixToggle = document.getElementById('netflix-toggle');
        netflixToggle.addEventListener('change', (e) => {
            this.toggleProduct('netflix', e.target.checked);
        });

        // Streamz toggle
        const streamzToggle = document.getElementById('streamz-toggle');
        streamzToggle.addEventListener('change', (e) => {
            this.toggleProduct('streamz', e.target.checked);
        });

        // Disney toggle
        const disneyToggle = document.getElementById('disney-toggle');
        disneyToggle.addEventListener('change', (e) => {
            this.toggleProduct('disney', e.target.checked);
        });

        // Sport toggle
        const sportToggle = document.getElementById('sport-toggle');
        sportToggle.addEventListener('change', (e) => {
            this.toggleProduct('sport', e.target.checked);
        });

        // Cinema toggle
        const cinemaToggle = document.getElementById('cinema-toggle');
        cinemaToggle.addEventListener('change', (e) => {
            this.toggleProduct('cinema', e.target.checked);
        });

        // Product header click listeners
        this.setupProductHeaderListeners();
    }

    setupProductHeaderListeners() {
        const products = [
            { id: 'netflix', headerSelector: '#netflix-block .product-header', toggleSelector: '#netflix-toggle' },
            { id: 'streamz', headerSelector: '#streamz-block .product-header', toggleSelector: '#streamz-toggle' },
            { id: 'disney', headerSelector: '#disney-block .product-header', toggleSelector: '#disney-toggle' },
            { id: 'sport', headerSelector: '#sport-block .product-header', toggleSelector: '#sport-toggle' },
            { id: 'cinema', headerSelector: '#cinema-block .product-header', toggleSelector: '#cinema-toggle' }
        ];

        products.forEach(product => {
            const header = document.querySelector(product.headerSelector);
            const toggle = document.querySelector(product.toggleSelector);
            
            if (header && toggle) {
                header.addEventListener('click', (e) => {
                    if (!this.state[product.id].enabled && !e.target.closest('.switch')) {
                        toggle.checked = true;
                        this.toggleProduct(product.id, true);
                    }
                });

                const switchElement = header.querySelector('.switch');
                if (switchElement) {
                    switchElement.addEventListener('click', (e) => {
                        if (this.state[product.id].enabled) {
                            e.stopPropagation();
                        }
                    });
                }
            }
        });
    }

    updateProductHeaderStates() {
        const products = ['netflix', 'streamz', 'disney', 'sport', 'cinema'];

        products.forEach(productId => {
            const header = document.querySelector(`#${productId}-block .product-header`);
            if (header) {
                if (this.state[productId].enabled) {
                    header.classList.remove('clickable');
                } else {
                    header.classList.add('clickable');
                }
            }
        });
    }

    toggleProduct(productType, enabled) {
        this.state[productType].enabled = enabled;
        const content = document.getElementById(`${productType}-content`);

        if (enabled) {
            content.style.display = 'block';
            if (productType === 'netflix' || productType === 'streamz') {
                this.renderTiers(productType);
                this.state[productType].selectedTier = this.data.entertainment[productType].defaultTier;
                this.updateTierInfo(productType);
            } else {
                this.updateProductInfo(productType);
            }
        } else {
            content.style.display = 'none';
        }

        this.updateAllSubtitles();
        this.updateProductHeaderStates();
        this.updateCostSummary();
    }

    renderTiers(productType) {
        const tiersContainer = document.getElementById(`${productType}-tiers`);
        const tiers = this.data.entertainment[productType].tiers;

        tiersContainer.innerHTML = tiers.map(tier => `
            <div class="tier-option ${tier.id === this.state[productType].selectedTier ? 'active' : ''}" 
                 onclick="app.selectTier('${productType}', ${tier.id})">
                <div class="tier-title">${tier.title}</div>
            </div>
        `).join('');
    }

    selectTier(productType, tierId) {
        this.state[productType].selectedTier = tierId;
        this.renderTiers(productType);
        this.updateTierInfo(productType);
        this.updateAllSubtitles();
        this.updateCostSummary();
    }

    updateTierInfo(productType) {
        const tier = this.data.entertainment[productType].tiers.find(t => t.id === this.state[productType].selectedTier);
        const infoContainer = document.getElementById(`${productType}-info`);

        const summaryItems = tier.summary.split(', ').map(item => `<li>${item}</li>`).join('');

        const discountPrice = this.getDiscountedPrice(tier.price);
        const hasDiscount = discountPrice < tier.price;

        let priceHtml;
        if (hasDiscount) {
            priceHtml = `
                <div class="tier-price-container">
                    <div class="original-price">€ ${tier.price.toFixed(2).replace('.', ',')}</div>
                    <div class="discount-price">€ ${discountPrice.toFixed(2).replace('.', ',')}/maand</div>
                    <div class="discount-info">5% combinatiekorting</div>
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

    updateProductInfo(productType) {
        const productData = this.data.entertainment[productType];
        const infoContainer = document.getElementById(`${productType}-info`);

        const summaryItems = productData.summary.split(', ').map(item => `<li>${item}</li>`).join('');

        const discountPrice = this.getDiscountedPrice(productData.price);
        const hasDiscount = discountPrice < productData.price;

        let priceHtml;
        if (hasDiscount) {
            priceHtml = `
                <div class="tier-price-container">
                    <div class="original-price">€ ${productData.price.toFixed(2).replace('.', ',')}</div>
                    <div class="discount-price">€ ${discountPrice.toFixed(2).replace('.', ',')}/maand</div>
                    <div class="discount-info">5% combinatiekorting</div>
                </div>
            `;
        } else {
            priceHtml = `<div class="tier-price">€ ${productData.price.toFixed(2).replace('.', ',')}/maand</div>`;
        }

        infoContainer.innerHTML = `
            <ul class="tier-details">
                ${summaryItems}
            </ul>
            ${priceHtml}
        `;
    }

    getDiscountedPrice(originalPrice) {
        const enabledProducts = this.getEnabledProductsCount();
        const discount = this.data.discounts.entertainment_combo;
        
        if (discount.enabled && enabledProducts >= discount.minProducts) {
            return originalPrice * (1 - discount.percentage / 100);
        }
        return originalPrice;
    }

    getEnabledProductsCount() {
        return Object.values(this.state).filter(product => product.enabled).length;
    }

    updateAllSubtitles() {
        const products = ['netflix', 'streamz', 'disney', 'sport', 'cinema'];
        
        products.forEach(productId => {
            this.updateSubtitle(productId);
        });
    }

    updateSubtitle(productType) {
        const subtitleElement = document.getElementById(`${productType}-subtitle`);
        const productData = this.data.entertainment[productType];

        if (productType === 'netflix' || productType === 'streamz') {
            const minPrice = Math.min(...productData.tiers.map(tier => this.getDiscountedPrice(tier.price)));
            subtitleElement.textContent = `Vanaf €${minPrice.toFixed(2).replace('.', ',')}`;
        } else {
            const discountPrice = this.getDiscountedPrice(productData.price);
            subtitleElement.textContent = `€${discountPrice.toFixed(2).replace('.', ',')}`;
        }
    }

    calculateTotal() {
        let total = 0;
        let totalDiscount = 0;
        const enabledProducts = this.getEnabledProductsCount();
        const hasComboDiscount = enabledProducts >= this.data.discounts.entertainment_combo.minProducts;

        // Netflix
        if (this.state.netflix.enabled) {
            const tier = this.data.entertainment.netflix.tiers.find(t => t.id === this.state.netflix.selectedTier);
            const discountedPrice = this.getDiscountedPrice(tier.price);
            total += discountedPrice;
            if (hasComboDiscount) {
                totalDiscount += tier.price - discountedPrice;
            }
        }

        // Streamz
        if (this.state.streamz.enabled) {
            const tier = this.data.entertainment.streamz.tiers.find(t => t.id === this.state.streamz.selectedTier);
            const discountedPrice = this.getDiscountedPrice(tier.price);
            total += discountedPrice;
            if (hasComboDiscount) {
                totalDiscount += tier.price - discountedPrice;
            }
        }

        // Disney
        if (this.state.disney.enabled) {
            const discountedPrice = this.getDiscountedPrice(this.data.entertainment.disney.price);
            total += discountedPrice;
            if (hasComboDiscount) {
                totalDiscount += this.data.entertainment.disney.price - discountedPrice;
            }
        }

        // Sport
        if (this.state.sport.enabled) {
            const discountedPrice = this.getDiscountedPrice(this.data.entertainment.sport.price);
            total += discountedPrice;
            if (hasComboDiscount) {
                totalDiscount += this.data.entertainment.sport.price - discountedPrice;
            }
        }

        // Cinema
        if (this.state.cinema.enabled) {
            const discountedPrice = this.getDiscountedPrice(this.data.entertainment.cinema.price);
            total += discountedPrice;
            if (hasComboDiscount) {
                totalDiscount += this.data.entertainment.cinema.price - discountedPrice;
            }
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

        // Show permanent promotion if applicable
        const permanentElement = document.getElementById('permanent-promotion');
        if (hasDiscounts) {
            permanentElement.style.display = 'flex';
            document.getElementById('permanent-amount').textContent = `- € ${totalDiscount.toFixed(2).replace('.', ',')}`;
        } else {
            permanentElement.style.display = 'none';
        }

        // Update final cost (same as monthly total for now)
        document.getElementById('final-cost').textContent = total.toFixed(2).replace('.', ',');
        document.getElementById('activation-cost').textContent = '0,00';

        // Update mobile summary
        this.updateMobileSummary();
    }

    updateMobileSummary() {
        const { total, totalDiscount } = this.calculateTotal();
        const hasDiscounts = totalDiscount > 0;
        const originalTotal = total + totalDiscount;

        // Update mobile monthly total
        document.getElementById('mobile-monthly-total').textContent = total.toFixed(2).replace('.', ',');

        // Update mobile strikethrough price
        const mobileStrikethroughElement = document.getElementById('mobile-strikethrough');
        if (hasDiscounts) {
            mobileStrikethroughElement.style.display = 'block';
            mobileStrikethroughElement.textContent = `€ ${originalTotal.toFixed(2).replace('.', ',')}`;
        } else {
            mobileStrikethroughElement.style.display = 'none';
        }

        // Update mobile advantage
        const mobileAdvantageElement = document.getElementById('mobile-advantage');
        if (hasDiscounts) {
            mobileAdvantageElement.style.display = 'block';
            document.getElementById('mobile-advantage-amount').textContent = totalDiscount.toFixed(2).replace('.', ',');
        } else {
            mobileAdvantageElement.style.display = 'none';
        }
    }
}

// Initialize the app
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new EntertainmentConfigurator();
});
