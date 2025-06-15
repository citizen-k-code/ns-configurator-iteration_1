class EntertainmentConfigurator {
    constructor() {
        this.data = null;
        this.mainData = null;
        this.mainState = null;
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
        this.loadMainConfiguratorState();
        this.setupEventListeners();
        this.updateAllSubtitles();
        this.updateProductHeaderStates();
        this.updateCostSummary();
        this.setupMobileSummaryObserver();
    }

    async loadData() {
        try {
            const response = await fetch('./entertainment-data.json');
            this.data = await response.json();

            const mainResponse = await fetch('./data.json');
            this.mainData = await mainResponse.json();
        } catch (error) {
            console.error('Error loading data:', error);
        }
    }

    loadMainConfiguratorState() {
        // Load state from localStorage if available, or parse URL parameters
        const savedState = localStorage.getItem('telecomConfiguratorState');
        if (savedState) {
            this.mainState = JSON.parse(savedState);
        } else {
            // Fallback to URL parameters
            this.mainState = {
                internet: { enabled: false, selectedTier: 1 },
                mobile: { enabled: false, simcards: [] },
                tv: { enabled: false, entertainmentBoxTier: 1 },
                fixedPhone: { enabled: false }
            };
            this.parseMainUrlParameters();
        }
    }

    parseMainUrlParameters() {
        const urlParams = new URLSearchParams(window.location.search);

        // Internet
        const internetTier = urlParams.get('internet');
        if (internetTier) {
            const tierId = parseInt(internetTier);
            if (tierId >= 1 && tierId <= 4) {
                this.mainState.internet.enabled = true;
                this.mainState.internet.selectedTier = tierId;
            }
        }

        // Mobile
        const mobileParams = urlParams.get('mobile');
        if (mobileParams) {
            const tierIds = mobileParams.split(',').map(id => parseInt(id.trim())).filter(id => id >= 1 && id <= 3);
            if (tierIds.length > 0 && tierIds.length <= this.mainData.products.mobile.maxSimcards) {
                this.mainState.mobile.enabled = true;
                this.mainState.mobile.simcards = tierIds.map((tierId, index) => ({
                    id: index + 1,
                    selectedTier: tierId
                }));
            }
        }

        // TV
        const tvEnabled = urlParams.get('tv');
        const entertainmentBoxTier = urlParams.get('box');
        if (tvEnabled === '1') {
            this.mainState.tv.enabled = true;
            if (entertainmentBoxTier) {
                const boxTierId = parseInt(entertainmentBoxTier);
                if (boxTierId >= 1 && boxTierId <= 2) {
                    this.mainState.tv.entertainmentBoxTier = boxTierId;
                }
            }
        }

        // Fixed Phone
        const phoneEnabled = urlParams.get('phone');
        if (phoneEnabled === '1') {
            this.mainState.fixedPhone.enabled = true;
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

    calculateMobileDiscount(tier, simcardIndex) {
        const permanentDiscount = this.mainData.discounts.permanent;
        const isInternetEnabled = this.mainState.internet.enabled;
        const isPermanentApplicable = permanentDiscount.enabled && 
                                    isInternetEnabled && 
                                    permanentDiscount.conditions.applicableToTiers.includes(tier.id);
        const hasTemporaryDiscount = tier.discountValue && simcardIndex >= 1;

        let finalPrice = tier.price;
        let permanentDiscountAmount = 0;
        let temporaryDiscountAmount = 0;

        if (isPermanentApplicable) {
            permanentDiscountAmount = tier.price * (permanentDiscount.percentage / 100);
            finalPrice = tier.price - permanentDiscountAmount;
        }

        if (hasTemporaryDiscount) {
            temporaryDiscountAmount = tier.discountValue;
            finalPrice = finalPrice - temporaryDiscountAmount;
        }

        return {
            hasDiscount: isPermanentApplicable || hasTemporaryDiscount,
            finalPrice: Math.max(0, finalPrice),
            permanentDiscountAmount,
            temporaryDiscountAmount,
            originalPrice: tier.price
        };
    }

    calculateMainConfiguratorTotal() {
        let total = 0;
        let totalPermanentDiscount = 0;
        let totalTemporaryDiscount = 0;

        // Internet cost
        if (this.mainState.internet.enabled) {
            const internetTier = this.mainData.products.internet.tiers.find(t => t.id === this.mainState.internet.selectedTier);
            if (internetTier.discountValue) {
                total += internetTier.price - internetTier.discountValue;
                totalTemporaryDiscount += internetTier.discountValue;
            } else {
                total += internetTier.price;
            }
        }

        // Mobile costs
        if (this.mainState.mobile.enabled) {
            this.mainState.mobile.simcards.forEach((simcard, index) => {
                const mobileTier = this.mainData.products.mobile.tiers.find(t => t.id === simcard.selectedTier);
                const discountCalc = this.calculateMobileDiscount(mobileTier, index);

                total += discountCalc.finalPrice;
                totalPermanentDiscount += discountCalc.permanentDiscountAmount;
                totalTemporaryDiscount += discountCalc.temporaryDiscountAmount;
            });
        }

        // TV cost
        if (this.mainState.tv.enabled) {
            const tvData = this.mainData.products.tv;
            if (tvData.discountValue) {
                total += tvData.price - tvData.discountValue;
                totalTemporaryDiscount += tvData.discountValue;
            } else {
                total += tvData.price;
            }

            // Entertainment Box cost
            const entertainmentBoxTier = tvData.entertainmentBox.tiers.find(t => t.id === this.mainState.tv.entertainmentBoxTier);
            if (entertainmentBoxTier && entertainmentBoxTier.price !== undefined) {
                if (entertainmentBoxTier.discountValue !== undefined) {
                    total += entertainmentBoxTier.price - entertainmentBoxTier.discountValue;
                    totalTemporaryDiscount += entertainmentBoxTier.discountValue;
                } else {
                    total += entertainmentBoxTier.price;
                }
            }
        }

        // Fixed Phone cost
        if (this.mainState.fixedPhone.enabled) {
            const phoneData = this.mainData.products.fixedPhone;
            total += phoneData.price;
        }

        return { 
            total, 
            totalPermanentDiscount, 
            totalTemporaryDiscount 
        };
    }

    calculateEntertainmentTotal() {
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

    calculateTotal() {
        const mainTotal = this.calculateMainConfiguratorTotal();
        const entertainmentTotal = this.calculateEntertainmentTotal();

        return {
            total: mainTotal.total + entertainmentTotal.total,
            totalDiscount: mainTotal.totalPermanentDiscount + mainTotal.totalTemporaryDiscount + entertainmentTotal.totalDiscount,
            totalPermanentDiscount: mainTotal.totalPermanentDiscount,
            totalTemporaryDiscount: mainTotal.totalTemporaryDiscount + entertainmentTotal.totalDiscount
        };
    }

    updateCostSummary() {
        const { total, totalDiscount, totalPermanentDiscount, totalTemporaryDiscount } = this.calculateTotal();
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

        // Show temporary promotions if applicable
        const temporaryElement = document.getElementById('temporary-promotion');
        if (totalTemporaryDiscount > 0) {
            temporaryElement.style.display = 'flex';
            document.getElementById('temporary-amount').textContent = `- € ${totalTemporaryDiscount.toFixed(2).replace('.', ',')}`;
        } else {
            temporaryElement.style.display = 'none';
        }

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

    setupMobileSummaryObserver() {
        const mainSummary = document.getElementById('part2');
        const mobileSummary = document.getElementById('mobile-bottom-summary');

        if (!mainSummary || !mobileSummary) return;

        const observer = new IntersectionObserver((entries) => {
            entries.forEach(entry => {
                if (entry.isIntersecting) {
                    // Main summary is visible, hide mobile summary
                    mobileSummary.classList.add('hidden');
                } else {
                    // Main summary is not visible, show mobile summary
                    mobileSummary.classList.remove('hidden');
                }
            });
        }, {
            threshold: 0.1, // Trigger when 10% of the element is visible
            rootMargin: '0px 0px -50px 0px' // Account for some margin
        });

        observer.observe(mainSummary);
    }

    scrollToMainSummary() {
        const mainSummary = document.getElementById('part2');
        if (mainSummary) {
            mainSummary.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    }

    calculateTotalPermanentDiscount() {
        const { totalPermanentDiscount } = this.calculateTotal();
        return totalPermanentDiscount * 12; // Convert to yearly amount
    }

    calculateTotalTemporaryDiscount() {
        let totalTemporaryDiscount = 0;

        // Main configurator temporary discounts
        const mainTotal = this.calculateMainConfiguratorTotal();

        // Internet temporary discount
        if (this.mainState.internet.enabled) {
            const internetTier = this.mainData.products.internet.tiers.find(t => t.id === this.mainState.internet.selectedTier);
            if (internetTier.discountValue && internetTier.discountPeriod) {
                totalTemporaryDiscount += internetTier.discountValue * internetTier.discountPeriod;
            }
        }

        // Mobile temporary discounts
        if (this.mainState.mobile.enabled) {
            this.mainState.mobile.simcards.forEach((simcard, index) => {
                const mobileTier = this.mainData.products.mobile.tiers.find(t => t.id === simcard.selectedTier);
                if (mobileTier.discountValue && mobileTier.discountPeriod && index >= 1) {
                    totalTemporaryDiscount += mobileTier.discountValue * mobileTier.discountPeriod;
                }
            });
        }

        // TV temporary discount
        if (this.mainState.tv.enabled) {
            const tvData = this.mainData.products.tv;
            if (tvData.discountValue && tvData.discountPeriod) {
                totalTemporaryDiscount += tvData.discountValue * tvData.discountPeriod;
            }

            // Entertainment Box temporary discount
            const entertainmentBoxTier = tvData.entertainmentBox.tiers.find(t => t.id === this.mainState.tv.entertainmentBoxTier);
            if (entertainmentBoxTier && entertainmentBoxTier.discountValue && entertainmentBoxTier.discountPeriod) {
                totalTemporaryDiscount += entertainmentBoxTier.discountValue * entertainmentBoxTier.discountPeriod;
            }
        }

        // Entertainment temporary discounts (5% combo discount calculated monthly)
        const entertainmentTotal = this.calculateEntertainmentTotal();
        if (entertainmentTotal.totalDiscount > 0) {
            // Assume the entertainment combo discount applies for 12 months
            totalTemporaryDiscount += entertainmentTotal.totalDiscount * 12;
        }

        return totalTemporaryDiscount;
    }

    openTooltipSheet(tooltipKey) {
        const tooltipData = this.mainData.tooltips[tooltipKey];
        if (!tooltipData) return;

        const overlay = document.getElementById('sheet-overlay');
        const title = document.getElementById('sheet-title');
        const body = document.getElementById('sheet-body');

        let content = tooltipData.content;

        // Dynamic content calculation for promotion sheets
        if (tooltipKey === 'permanent_promotion') {
            const totalPermanentYearly = this.calculateTotalPermanentDiscount();
            content = content.replace('##NUMBER##', `€ ${totalPermanentYearly.toFixed(2).replace('.', ',')}`);
        } else if (tooltipKey === 'temporary_promotion') {
            const totalTemporary = this.calculateTotalTemporaryDiscount();
            content = content.replace('##NUMBER##', `€ ${totalTemporary.toFixed(2).replace('.', ',')}`);
        }

        title.innerHTML = tooltipData.title;
        body.innerHTML = content;

        overlay.style.display = 'flex';

        // Prevent body scroll when sheet is open
        document.body.style.overflow = 'hidden';
    }

    closeTooltipSheet() {
        const overlay = document.getElementById('sheet-overlay');
        overlay.style.display = 'none';

        // Restore body scroll
        document.body.style.overflow = '';
    }
}

// Initialize the app
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new EntertainmentConfigurator();
});