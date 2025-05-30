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
            },
            tv: {
                enabled: false,
                entertainmentBoxTier: 1
            },
            fixedPhone: {
                enabled: false
            }
        };
        this.init();
    }

    async init() {
        await this.loadData();
        this.setupEventListeners();
        this.setupMobileSummaryObserver();
        this.updateHighlightBlocks();
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

        // TV toggle
        const tvToggle = document.getElementById('tv-toggle');
        tvToggle.addEventListener('change', (e) => {
            this.toggleProduct('tv', e.target.checked);
        });

        // Fixed phone toggle
        const fixedPhoneToggle = document.getElementById('fixed-phone-toggle');
        fixedPhoneToggle.addEventListener('change', (e) => {
            this.toggleProduct('fixedPhone', e.target.checked);
        });
    }

    toggleProduct(productType, enabled) {
        this.state[productType].enabled = enabled;
        const contentId = productType === 'fixedPhone' ? 'fixed-phone-content' : `${productType}-content`;
        const content = document.getElementById(contentId);

        if (enabled) {
            content.style.display = 'block';
            if (productType === 'internet') {
                this.renderInternetTiers();
                this.state.internet.selectedTier = this.data.products.internet.defaultTier;
                this.updateInternetInfo();
                // Re-render mobile simcards to update pricing based on permanent discounts
                if (this.state.mobile.enabled) {
                    this.renderMobileSimcards();
                }
            } else if (productType === 'mobile') {
                this.state.mobile.simcards = [{
                    id: 1,
                    selectedTier: this.data.products.mobile.defaultTier
                }];
                this.renderMobileSimcards();
            } else if (productType === 'tv') {
                this.state.tv.entertainmentBoxTier = this.data.products.tv.entertainmentBox.defaultTier;
                this.updateTvInfo();
                this.renderEntertainmentBoxTiers();
            } else if (productType === 'fixedPhone') {
                this.updateFixedPhoneInfo();
            }
        } else {
            content.style.display = 'none';
            if (productType === 'mobile') {
                this.state.mobile.simcards = [];
            } else if (productType === 'internet') {
                // Re-render mobile simcards to update pricing when Internet is disabled
                if (this.state.mobile.enabled) {
                    this.renderMobileSimcards();
                }
            }
        }

        // Update highlight blocks after any product toggle
        this.updateHighlightBlocks();
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
        // Re-render mobile simcards to update pricing based on permanent discounts
        if (this.state.mobile.enabled) {
            this.renderMobileSimcards();
        }
        this.updateCostSummary();
    }

    updateInternetInfo() {
        const tier = this.data.products.internet.tiers.find(t => t.id === this.state.internet.selectedTier);
        const infoContainer = document.getElementById('internet-info');

        const summaryItems = tier.summary.split(', ').map(item => `<li>${item}</li>`).join('');

        let priceHtml;
        if (tier.discountValue) {
            const discountPrice = tier.price - tier.discountValue;
            priceHtml = `
                <div class="tier-price-container">
                    <div class="original-price">€ ${tier.price.toFixed(2).replace('.', ',')}</div>
                    <div class="discount-price">€ ${discountPrice.toFixed(2).replace('.', ',')}/maand</div>
                    <div class="discount-info">${tier.discountCopy.temporaryOnly}</div>
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
        const discountCalc = this.calculateMobileDiscount(tier, simcardIndex);
        const hasDiscount = discountCalc.hasDiscount;

        if (hasDiscount) {
            const { finalPrice, permanentDiscountAmount, temporaryDiscountAmount } = discountCalc;
            let discountCopy = '';
            
            if (permanentDiscountAmount > 0 && temporaryDiscountAmount > 0) {
                // Calculate price after temporary discount ends (only permanent discount applied)
                const priceAfterTemp = tier.price - permanentDiscountAmount;
                discountCopy = tier.discountCopy.both
                    .replace('##MONTHS##', tier.discountPeriod)
                    .replace('##NEWPRICE##', `€ ${priceAfterTemp.toFixed(2).replace('.', ',')}`);
            } else if (permanentDiscountAmount > 0) {
                discountCopy = tier.discountCopy.permanentOnly;
            } else if (temporaryDiscountAmount > 0) {
                discountCopy = tier.discountCopy.temporaryOnly;
            }

            priceHtml = `
                <div class="tier-price-container">
                    <div class="original-price">€ ${tier.price.toFixed(2).replace('.', ',')}</div>
                    <div class="discount-price">€ ${finalPrice.toFixed(2).replace('.', ',')}/maand</div>
                    <div class="discount-info">${discountCopy}</div>
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

    calculateMobileDiscount(tier, simcardIndex) {
        const permanentDiscount = this.data.discounts.permanent;
        const isInternetEnabled = this.state.internet.enabled;
        const isPermanentApplicable = permanentDiscount.enabled && 
                                    isInternetEnabled && 
                                    permanentDiscount.conditions.applicableToTiers.includes(tier.id);
        const hasTemporaryDiscount = tier.discountValue && simcardIndex >= 1;

        let finalPrice = tier.price;
        let permanentDiscountAmount = 0;
        let temporaryDiscountAmount = 0;

        // Apply permanent discount first
        if (isPermanentApplicable) {
            permanentDiscountAmount = tier.price * (permanentDiscount.percentage / 100);
            finalPrice = tier.price - permanentDiscountAmount;
        }

        // Apply temporary discount to the price after permanent discount
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

    calculateTotal() {
        let total = 0;
        let totalPermanentDiscount = 0;
        let totalTemporaryDiscount = 0;

        // Internet cost
        if (this.state.internet.enabled) {
            const internetTier = this.data.products.internet.tiers.find(t => t.id === this.state.internet.selectedTier);
            if (internetTier.discountValue) {
                total += internetTier.price - internetTier.discountValue;
                totalTemporaryDiscount += internetTier.discountValue;
            } else {
                total += internetTier.price;
            }
        }

        // Mobile costs
        if (this.state.mobile.enabled) {
            this.state.mobile.simcards.forEach((simcard, index) => {
                const mobileTier = this.data.products.mobile.tiers.find(t => t.id === simcard.selectedTier);
                const discountCalc = this.calculateMobileDiscount(mobileTier, index);

                total += discountCalc.finalPrice;
                totalPermanentDiscount += discountCalc.permanentDiscountAmount;
                totalTemporaryDiscount += discountCalc.temporaryDiscountAmount;
            });
        }

        // TV cost
        if (this.state.tv.enabled) {
            const tvData = this.data.products.tv;
            if (tvData.discountValue) {
                total += tvData.price - tvData.discountValue;
                totalTemporaryDiscount += tvData.discountValue;
            } else {
                total += tvData.price;
            }

            // Entertainment Box cost
            const entertainmentBoxTier = tvData.entertainmentBox.tiers.find(t => t.id === this.state.tv.entertainmentBoxTier);
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
        if (this.state.fixedPhone.enabled) {
            const phoneData = this.data.products.fixedPhone;
            total += phoneData.price;
        }

        const totalDiscount = totalPermanentDiscount + totalTemporaryDiscount;

        return { 
            total, 
            totalDiscount, 
            totalPermanentDiscount, 
            totalTemporaryDiscount 
        };
    }

    updateTvInfo() {
        const tvData = this.data.products.tv;
        const infoContainer = document.getElementById('tv-info');

        const summaryItems = tvData.summary.split(', ').map(item => `<li>${item}</li>`).join('');

        let priceHtml;
        if (tvData.discountValue) {
            const discountPrice = tvData.price - tvData.discountValue;
            priceHtml = `
                <div class="tier-price-container">
                    <div class="original-price">€ ${tvData.price.toFixed(2).replace('.', ',')}</div>
                    <div class="discount-price">€ ${discountPrice.toFixed(2).replace('.', ',')}/maand</div>
                    <div class="discount-info">${tvData.discountCopy.temporaryOnly}</div>
                </div>
            `;
        } else {
            priceHtml = `<div class="tier-price">€ ${tvData.price.toFixed(2).replace('.', ',')}/maand</div>`;
        }

        infoContainer.innerHTML = `
            <ul class="tier-details">
                ${summaryItems}
            </ul>
            ${priceHtml}
        `;
    }

    renderEntertainmentBoxTiers() {
        const tiersContainer = document.getElementById('entertainment-box-tiers');
        const tiers = this.data.products.tv.entertainmentBox.tiers;

        tiersContainer.innerHTML = tiers.map(tier => `
            <div class="tier-option ${tier.id === this.state.tv.entertainmentBoxTier ? 'active' : ''}" 
                 onclick="app.selectEntertainmentBoxTier(${tier.id})">
                <div class="tier-title">${tier.title}</div>
            </div>
        `).join('');

        this.updateEntertainmentBoxInfo();
    }

    selectEntertainmentBoxTier(tierId) {
        this.state.tv.entertainmentBoxTier = tierId;
        this.renderEntertainmentBoxTiers();
        this.updateCostSummary();
    }

    updateEntertainmentBoxInfo() {
        const tier = this.data.products.tv.entertainmentBox.tiers.find(t => t.id === this.state.tv.entertainmentBoxTier);
        const infoContainer = document.getElementById('entertainment-box-info');

        // Hide the info container if "Nee bedankt" (tier 1) is selected or if no summary exists
        if (tier.id === 1 || !tier.summary) {
            infoContainer.style.display = 'none';
            infoContainer.innerHTML = '';
            return;
        }

        // Show the info container and populate it
        infoContainer.style.display = 'block';
        
        const summaryItems = tier.summary.split(', ').map(item => `<li>${item}</li>`).join('');

        let priceHtml;
        if (tier.discountValue !== undefined) {
            const discountPrice = tier.price - tier.discountValue;
            priceHtml = `
                <div class="tier-price-container">
                    <div class="original-price">€ ${tier.price.toFixed(2).replace('.', ',')}</div>
                    <div class="discount-price">€ ${discountPrice.toFixed(2).replace('.', ',')}/maand</div>
                    <div class="discount-info">${tier.discountCopy.temporaryOnly}</div>
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

    updateFixedPhoneInfo() {
        const phoneData = this.data.products.fixedPhone;
        const infoContainer = document.getElementById('fixed-phone-info');

        if (!infoContainer) {
            console.error('Fixed phone info container not found');
            return;
        }

        const summaryItems = phoneData.summary.split(', ').map(item => `<li>${item}</li>`).join('');

        infoContainer.innerHTML = `
            <ul class="tier-details">
                ${summaryItems}
            </ul>
            <div class="tier-price">€ ${phoneData.price.toFixed(2).replace('.', ',')}/maand</div>
        `;
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

        // Show permanent promotion if applicable
        const permanentElement = document.getElementById('permanent-promotion');
        if (totalPermanentDiscount > 0) {
            permanentElement.style.display = 'flex';
            document.getElementById('permanent-amount').textContent = `- € ${totalPermanentDiscount.toFixed(2).replace('.', ',')}`;
        } else {
            permanentElement.style.display = 'none';
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

        // Internet temporary discount
        if (this.state.internet.enabled) {
            const internetTier = this.data.products.internet.tiers.find(t => t.id === this.state.internet.selectedTier);
            if (internetTier.discountValue && internetTier.discountPeriod) {
                totalTemporaryDiscount += internetTier.discountValue * internetTier.discountPeriod;
            }
        }

        // Mobile temporary discounts
        if (this.state.mobile.enabled) {
            this.state.mobile.simcards.forEach((simcard, index) => {
                const mobileTier = this.data.products.mobile.tiers.find(t => t.id === simcard.selectedTier);
                if (mobileTier.discountValue && mobileTier.discountPeriod && index >= 1) {
                    totalTemporaryDiscount += mobileTier.discountValue * mobileTier.discountPeriod;
                }
            });
        }

        // TV temporary discount
        if (this.state.tv.enabled) {
            const tvData = this.data.products.tv;
            if (tvData.discountValue && tvData.discountPeriod) {
                totalTemporaryDiscount += tvData.discountValue * tvData.discountPeriod;
            }

            // Entertainment Box temporary discount
            const entertainmentBoxTier = tvData.entertainmentBox.tiers.find(t => t.id === this.state.tv.entertainmentBoxTier);
            if (entertainmentBoxTier && entertainmentBoxTier.discountValue && entertainmentBoxTier.discountPeriod) {
                totalTemporaryDiscount += entertainmentBoxTier.discountValue * entertainmentBoxTier.discountPeriod;
            }
        }

        return totalTemporaryDiscount;
    }

    openTooltipSheet(tooltipKey) {
        const tooltipData = this.data.tooltips[tooltipKey];
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

    updateHighlightBlocks() {
        const mobileContent = document.getElementById('mobile-content');
        const mobileBlock = document.getElementById('mobile-block');
        
        // Remove existing highlight blocks
        const existingHighlights = document.querySelectorAll('.highlight-block');
        existingHighlights.forEach(block => block.remove());

        const highlightHtml = `
            <div class="highlight-block">
                <div class="highlight-block-title">${this.data.highlightBlock.title}</div>
                <div class="highlight-block-content">${this.data.highlightBlock.content}</div>
            </div>
        `;

        if (!this.state.mobile.enabled) {
            // Mobile off: Add to mobile block after header
            const mobileHeader = mobileBlock.querySelector('.product-header');
            mobileHeader.insertAdjacentHTML('afterend', highlightHtml);
        } else if (this.state.mobile.enabled && !this.state.internet.enabled) {
            // Mobile on, Internet off: Add to mobile content after tooltip link
            const tooltipLink = mobileContent.querySelector('.tooltip-link');
            tooltipLink.insertAdjacentHTML('afterend', highlightHtml);
        }
    }
}

// Initialize the app
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new TelecomConfigurator();
});