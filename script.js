class UnifiedConfigurator {
    constructor() {
        this.data = null;
        this.entertainmentData = null;
        this.currentSection = 'telecom'; // 'telecom' or 'entertainment'
        this.state = {
            // Telecom state
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
            entertainmentBox: {
                enabled: false
            },
            entertainmentServices: {
                netflix: { enabled: false, selectedTier: 1 },
                streamz: { enabled: false, selectedTier: 1 },
                disney: { enabled: false },
                sport: { enabled: false },
                cinema: { enabled: false }
            },
            fixedPhone: {
                enabled: false
            },
            // Main entertainment toggle state
            entertainment: {
                enabled: false
            },
            entertainmentBox: {
                enabled: false
            },
            // Entertainment state
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
            },
            hbo: {
                enabled: false,
                selectedTier: 1
            },
            // Track selected entertainment services for the new interface
            selectedEntertainmentServices: new Set()
        };
        this.init();
    }

    async init() {
        try {
            await this.loadData();
            this.parseUrlParameters();
            this.setupEventListeners();
            this.setupMobileSummaryObserver();
            this.updateHighlightBlocks();
            this.updateProductHeaderStates();
            this.updateAllEntertainmentSubtitles();
            this.updateCostSummary();
        } catch (error) {
            console.error('Error initializing configurator:', error);
        }
    }

    async loadData() {
        try {
            const [dataResponse, entertainmentResponse] = await Promise.all([
                fetch('./data.json'),
                fetch('./entertainment-data.json')
            ]);
            this.data = await dataResponse.json();
            this.entertainmentData = await entertainmentResponse.json();
        } catch (error) {
            console.error('Error loading data:', error);
        }
    }

    parseUrlParameters() {
        const urlParams = new URLSearchParams(window.location.search);

        // Internet: ?internet=2 (tier ID)
        const internetTier = urlParams.get('internet');
        if (internetTier) {
            const tierId = parseInt(internetTier);
            if (tierId >= 1 && tierId <= 4) {
                this.state.internet.enabled = true;
                this.state.internet.selectedTier = tierId;
                const internetToggle = document.getElementById('internet-toggle');
                const internetContent = document.getElementById('internet-content');
                if (internetToggle && internetContent) {
                    internetToggle.checked = true;
                    internetContent.style.display = 'block';
                    this.renderInternetTiers();
                    this.updateInternetInfo();
                }
            }
        }

        // Mobile: ?mobile=2,3,1 (comma-separated tier IDs for each simcard)
        const mobileParams = urlParams.get('mobile');
        if (mobileParams) {
            const tierIds = mobileParams.split(',').map(id => parseInt(id.trim())).filter(id => id >= 1 && id <= 3);
            if (tierIds.length > 0 && tierIds.length <= this.data.products.mobile.maxSimcards) {
                this.state.mobile.enabled = true;
                this.state.mobile.simcards = tierIds.map((tierId, index) => ({
                    id: index + 1,
                    selectedTier: tierId
                }));
                const mobileToggle = document.getElementById('mobile-toggle');
                const mobileContent = document.getElementById('mobile-content');
                if (mobileToggle && mobileContent) {
                    mobileToggle.checked = true;
                    mobileContent.style.display = 'block';
                    this.renderMobileSimcards();
                }
            }
        }

        // TV: ?tv=1&box=2 (tv=1 enables TV, box=tier ID for entertainment box)
        const tvEnabled = urlParams.get('tv');
        const entertainmentBoxTier = urlParams.get('box');
        if (tvEnabled === '1') {
            this.state.tv.enabled = true;
            if (entertainmentBoxTier) {
                const boxTierId = parseInt(entertainmentBoxTier);
                if (boxTierId >= 1 && boxTierId <= 2) {
                    this.state.tv.entertainmentBoxTier = boxTierId;
                }
            }
            const tvToggle = document.getElementById('tv-toggle');
            const tvContent = document.getElementById('tv-content');
            if (tvToggle && tvContent) {
                tvToggle.checked = true;
                tvContent.style.display = 'block';
                this.updateTvInfo();
                this.setEntertainmentBoxCheckbox(this.state.tv.entertainmentBoxTier === 2);

                // Enable Entertainment Box by default when TV is enabled via URL
                this.state.entertainmentBox.enabled = true;
                const entertainmentBoxToggle = document.getElementById('entertainment-box-toggle');
                const entertainmentBoxContent = document.getElementById('entertainment-box-content');

                if (entertainmentBoxToggle) {
                    entertainmentBoxToggle.checked = true;
                }
                if (entertainmentBoxContent) {
                    entertainmentBoxContent.style.display = 'block';
                    // Use setTimeout to ensure DOM is ready
                    setTimeout(() => {
                        this.updateEntertainmentBoxStandaloneInfo();
                    }, 100);
                }
            }
        }

        // Fixed Phone: ?phone=1 (1 enables fixed phone)
        const phoneEnabled = urlParams.get('phone');
        if (phoneEnabled === '1') {
            this.state.fixedPhone.enabled = true;
            const fixedPhoneToggle = document.getElementById('fixed-phone-toggle');
            const fixedPhoneContent = document.getElementById('fixed-phone-content');
            if (fixedPhoneToggle && fixedPhoneContent) {
                fixedPhoneToggle.checked = true;
                fixedPhoneContent.style.display = 'block';
                this.updateFixedPhoneInfo();
            }
        }
    }

    setupEventListeners() {
        // Telecom toggles - check if elements exist first
        const internetToggle = document.getElementById('internet-toggle');
        if (internetToggle) {
            internetToggle.addEventListener('change', (e) => {
                this.toggleProduct('internet', e.target.checked);
            });
        }

        const mobileToggle = document.getElementById('mobile-toggle');
        if (mobileToggle) {
            mobileToggle.addEventListener('change', (e) => {
                this.toggleProduct('mobile', e.target.checked);
            });
        }

        const addSimcardBtn = document.getElementById('add-simcard-btn');
        if (addSimcardBtn) {
            addSimcardBtn.addEventListener('click', () => {
                this.addSimcard();
            });
        }

        const tvToggle = document.getElementById('tv-toggle');
        if (tvToggle) {
            tvToggle.addEventListener('change', (e) => {
                this.toggleProduct('tv', e.target.checked);
            });
        }



        const fixedPhoneToggle = document.getElementById('fixed-phone-toggle');
        if (fixedPhoneToggle) {
            fixedPhoneToggle.addEventListener('change', (e) => {
                this.toggleProduct('fixedPhone', e.target.checked);
            });
        }

        // Individual entertainment service toggles are handled within the entertainment interface

        // Entertainment toggle (only if element exists)
        const entertainmentToggle = document.getElementById('entertainment-toggle');
        if (entertainmentToggle) {
            entertainmentToggle.addEventListener('change', (e) => {
                this.toggleProduct('entertainment', e.target.checked);
            });
        }

        // Entertainment Box toggle (only if element exists)
        const entertainmentBoxToggle = document.getElementById('entertainment-box-toggle');
        if (entertainmentBoxToggle) {
            entertainmentBoxToggle.addEventListener('change', (e) => {
                this.toggleProduct('entertainmentBox', e.target.checked);
            });
        }

        // Product header click listeners
        this.setupProductHeaderListeners();
    }

    setupProductHeaderListeners() {
        const allProducts = [
            { id: 'internet', headerSelector: '#internet-block .product-header', toggleSelector: '#internet-toggle' },
            { id: 'mobile', headerSelector: '#mobile-block .product-header', toggleSelector: '#mobile-toggle' },
            { id: 'tv', headerSelector: '#tv-block .product-header', toggleSelector: '#tv-toggle' },
            { id: 'fixedPhone', headerSelector: '#fixed-phone-block .product-header', toggleSelector: '#fixed-phone-toggle' },
            { id: 'entertainment', headerSelector: '#entertainment-block .product-header', toggleSelector: '#entertainment-toggle' },
            { id: 'entertainmentBox', headerSelector: '#entertainment-box-block .product-header', toggleSelector: '#entertainment-box-toggle' }
        ];

        allProducts.forEach(product => {
            const header = document.querySelector(product.headerSelector);
            const toggle = document.querySelector(product.toggleSelector);

            // Only set up listeners if both elements exist
            if (header && toggle) {
                header.addEventListener('click', (e) => {
                    // Don't toggle if clicking on the switch itself or if already enabled
                    if (!e.target.closest('.switch')) {
                        toggle.checked = !toggle.checked;
                        this.toggleProduct(product.id, toggle.checked);
                    }
                });

                const switchElement = header.querySelector('.switch');
                if (switchElement) {
                    switchElement.addEventListener('click', (e) => {
                        // Allow the switch to handle its own click
                        e.stopPropagation();
                    });
                }
            }
        });
    }

    updateProductHeaderStates() {
        const allProducts = ['internet', 'mobile', 'tv', 'fixedPhone', 'entertainment', 'entertainmentBox'];

        allProducts.forEach(productId => {
            let blockId;
            if (productId === 'fixedPhone') {
                blockId = 'fixed-phone-block';
            } else if (productId === 'entertainmentBox') {
                blockId = 'entertainment-box-block';
            } else {
                blockId = `${productId}-block`;
            }
            const header = document.querySelector(`#${blockId} .product-header`);

            // Only update if both the header element and state exist
            if (header && this.state[productId]) {
                if (this.state[productId].enabled) {
                    header.classList.remove('clickable');
                } else {
                    header.classList.add('clickable');
                }
            }
        });
    }

    // Utility method to smoothly scroll element into view
    scrollToElementSmooth(element) {
        if (!element) return;

        // Check if we're on mobile (viewport width < 1024px)
        const isMobile = window.innerWidth < 1024;
        const mobileBottomSummary = document.getElementById('mobile-bottom-summary');

        if (isMobile && mobileBottomSummary) {
            // Get the height of the mobile bottom summary
            const bottomSummaryHeight = mobileBottomSummary.offsetHeight;

            // Calculate the position to scroll to
            const elementRect = element.getBoundingClientRect();
            const viewportHeight = window.innerHeight;
            const availableHeight = viewportHeight - bottomSummaryHeight;

            // Only scroll if the element extends below the available space
            if (elementRect.bottom > availableHeight) {
                const scrollOffset = elementRect.bottom - availableHeight + 20; // 20px buffer
                window.scrollBy({
                    top: scrollOffset,
                    behavior: 'smooth'
                });
            }
        } else {
            // Desktop behavior - use standard scrollIntoView
            element.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest',
                inline: 'nearest'
            });
        }
    }

    // Navigation methods
    showEntertainmentSection() {
        document.getElementById('part1').style.display = 'none';
        document.getElementById('entertainment-section').style.display = 'block';
        this.currentSection = 'entertainment';
        this.updateOrderButtons();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    showTelecomSection() {
        document.getElementById('part1').style.display = 'block';
        document.getElementById('entertainment-section').style.display = 'none';
        this.currentSection = 'telecom';
        this.updateOrderButtons();
        window.scrollTo({ top: 0, behavior: 'smooth' });
    }

    updateOrderButtons() {
        const mainOrderBtn = document.getElementById('main-order-btn');
        const mobileOrderBtn = document.getElementById('mobile-order-btn');

        if (this.currentSection === 'telecom') {
            mainOrderBtn.textContent = 'Verder';
            mobileOrderBtn.textContent = 'Verder';
        } else {
            mainOrderBtn.textContent = 'Bestellen';
            mobileOrderBtn.textContent = 'Bestellen';
        }
    }

    handleOrderButton() {
        if (this.currentSection === 'telecom') {
            this.showEntertainmentSection();
        } else {
            // Handle final order
            console.log('Order placed!', this.state);
        }
    }

    handleMobileOrderButton() {
        this.handleOrderButton();
    }

    // Telecom product methods (same as before)
    toggleProduct(productType, enabled) {
        this.state[productType].enabled = enabled;

        // Handle telecom products
        if (['internet', 'mobile', 'tv', 'fixedPhone'].includes(productType)) {
            const contentId = productType === 'fixedPhone' ? 'fixed-phone-content' : `${productType}-content`;
            const content = document.getElementById(contentId);

            if (enabled) {
                content.style.display = 'block';
                if (productType === 'internet') {
                    this.renderInternetTiers();
                    this.state.internet.selectedTier = this.data.products.internet.defaultTier;
                    this.updateInternetInfo();
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
                    this.setEntertainmentBoxCheckbox(this.state.tv.entertainmentBoxTier === 2);

                    // Enable Entertainment Box by default when TV is enabled
                    this.state.entertainmentBox.enabled = true;
                    const entertainmentBoxToggle = document.getElementById('entertainment-box-toggle');
                    const entertainmentBoxContent = document.getElementById('entertainment-box-content');

                    if (entertainmentBoxToggle) {
                        entertainmentBoxToggle.checked = true;
                    }
                    if (entertainmentBoxContent) {
                        entertainmentBoxContent.style.display = 'block';
                        this.updateEntertainmentBoxStandaloneInfo();
                    }
                } else if (productType === 'fixedPhone') {
                    this.updateFixedPhoneInfo();
                }

                // Smooth scroll to ensure the product block is visible
                setTimeout(() => {
                    const blockId = productType === 'fixedPhone' ? 'fixed-phone-block' : `${productType}-block`;
                    const productBlock = document.getElementById(blockId);
                    this.scrollToElementSmooth(productBlock);
                }, 100);
            } else {
                content.style.display = 'none';
                if (productType === 'mobile') {
                    this.state.mobile.simcards = [];
                } else if (productType === 'internet') {
                    if (this.state.mobile.enabled) {
                        this.renderMobileSimcards();
                    }
                }
            }
            this.updateHighlightBlocks();
        }
        // Handle main entertainment toggle
        else if (productType === 'entertainment') {
            const content = document.getElementById('entertainment-content');
            const closedState = document.getElementById('entertainment-closed-state');

            if (enabled) {
                content.style.display = 'block';
                closedState.style.display = 'none';
                this.renderAvailableEntertainmentServices();
                this.renderSelectedEntertainmentServices();

                // Smooth scroll to ensure the product block is visible
                setTimeout(() => {
                    const productBlock = document.getElementById('entertainment-block');
                    this.scrollToElementSmooth(productBlock);
                }, 100);
            } else {
                content.style.display = 'none';
                closedState.style.display = 'block';
                // Clear all selected entertainment services
                this.state.selectedEntertainmentServices.clear();
                ['netflix', 'streamz', 'disney', 'sport', 'cinema', 'hbo'].forEach(service => {
                    this.state[service].enabled = false;
                });
            }
        }
        // Handle entertainment box toggle
        else if (productType === 'entertainmentBox') {
            const content = document.getElementById('entertainment-box-content');

            if (enabled) {
                content.style.display = 'block';
                this.updateEntertainmentBoxStandaloneInfo();

                // Smooth scroll to ensure the product block is visible
                setTimeout(() => {
                    const productBlock = document.getElementById('entertainment-box-block');
                    this.scrollToElementSmooth(productBlock);
                }, 100);
            } else {
                content.style.display = 'none';
            }
        } 
        // Individual entertainment services are handled within the entertainment interface

        this.updateProductHeaderStates();
        this.updateCostSummary();
    }

    // Internet methods
    renderInternetTiers() {
        const tiersContainer = document.getElementById('internet-tiers');
        if (!tiersContainer || !this.data) return;

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
        if (this.state.mobile.enabled) {
            this.renderMobileSimcards();
        }
        this.updateCostSummary();
    }

    updateInternetInfo() {
        const infoContainer = document.getElementById('internet-info');
        if (!infoContainer || !this.data) return;

        const tier = this.data.products.internet.tiers.find(t => t.id === this.state.internet.selectedTier);
        if (!tier) return;

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

    // Mobile methods
    renderMobileSimcards() {
        const container = document.getElementById('simcards-container');
        const addBtn = document.getElementById('add-simcard-btn');

        if (!container || !addBtn || !this.data) return;

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

    // TV methods
    updateTvInfo() {
        const infoContainer = document.getElementById('tv-info');
        if (!infoContainer || !this.data) return;

        const tvData = this.data.products.tv;

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

    toggleEntertainmentBoxOption() {
        const checkbox = document.getElementById('entertainment-box-checkbox');
        checkbox.checked = !checkbox.checked;

        const isChecked = checkbox.checked;
        this.state.tv.entertainmentBoxTier = isChecked ? 2 : 1; // 2 = with box, 1 = without box

        this.updateEntertainmentBoxInfo();
        this.updateCostSummary();
    }

    setEntertainmentBoxCheckbox(enabled) {
        const checkbox = document.getElementById('entertainment-box-checkbox');
        if (checkbox) {
            checkbox.checked = enabled;
            this.state.tv.entertainmentBoxTier = enabled ? 2 : 1;
            this.updateEntertainmentBoxInfo();
        }
    }

    updateEntertainmentBoxInfo() {
        const tier = this.data.products.tv.entertainmentBox.tiers.find(t => t.id === this.state.tv.entertainmentBoxTier);
        const infoContainer = document.getElementById('entertainment-box-info');

        if (tier.id === 1 || !tier.summary) {
            infoContainer.style.display = 'none';
            infoContainer.innerHTML = '';
            return;
        }

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

    updateEntertainmentBoxStandaloneInfo() {
        const entertainmentBoxData = this.data.products.entertainmentBox;
        const infoContainer = document.getElementById('entertainment-box-info');

        if (!infoContainer || !entertainmentBoxData) {
            return;
        }

        const summaryItems = entertainmentBoxData.summary.split(', ').map(item => `<li>${item}</li>`).join('');

        infoContainer.innerHTML = `
            <ul class="tier-details">
                ${summaryItems}
            </ul>
            <div class="tier-price">€ ${entertainmentBoxData.price.toFixed(2).replace('.', ',')}/maand</div>
        `;
    }

    // Fixed Phone methods
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

    // Entertainment methods
    renderEntertainmentTiers(productType) {
        const tiersContainer = document.getElementById(`${productType}-tiers`);
        if (!tiersContainer || !this.entertainmentData) return;

        const tiers = this.entertainmentData.entertainment[productType].tiers;

        tiersContainer.innerHTML = tiers.map(tier => {
            const discountedPrice = this.getEntertainmentDiscountedPrice(tier.price);
            const priceText = `€${discountedPrice.toFixed(2).replace('.', ',')}`;

            return `
                <div class="tier-option ${tier.id === this.state[productType].selectedTier ? 'active' : ''}" 
                     onclick="app.selectEntertainmentTier('${productType}', ${tier.id})">
                    <div class="tier-title">${tier.title}</div>
                    <div class="tier-subtitle">${priceText}</div>
                </div>
            `;
        }).join('');
    }

    selectEntertainmentTier(productType, tierId) {
        this.state[productType].selectedTier = tierId;
        this.renderEntertainmentTiers(productType);
        this.updateEntertainmentTierInfo(productType);
        this.updateAllEntertainmentSubtitles();
        this.updateCostSummary();
    }

    updateEntertainmentTierInfo(productType) {
        if (!this.entertainmentData) return;

        const tier = this.entertainmentData.entertainment[productType].tiers.find(t => t.id === this.state[productType].selectedTier);
        const infoContainer = document.getElementById(`${productType}-info`);

        if (!infoContainer || !tier) return;

        const summaryItems = tier.summary.split(', ').map(item => `<li>${item}</li>`).join('');

        const discountPrice = this.getEntertainmentDiscountedPrice(tier.price);
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

    updateEntertainmentProductInfo(productType) {
        if (!this.entertainmentData) return;

        const productData = this.entertainmentData.entertainment[productType];
        const infoContainer = document.getElementById(`${productType}-info`);

        if (!infoContainer || !productData) return;

        const summaryItems = productData.summary.split(', ').map(item => `<li>${item}</li>`).join('');

        const discountPrice = this.getEntertainmentDiscountedPrice(productData.price);
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

    getEntertainmentDiscountedPrice(originalPrice) {
        const enabledProducts = this.getEnabledEntertainmentProductsCount();
        const discount = this.entertainmentData.discounts.entertainment_combo;

        if (discount.enabled && enabledProducts >= discount.minProducts) {
            return originalPrice * (1 - discount.percentage / 100);
        }
        return originalPrice;
    }

    getEnabledEntertainmentProductsCount() {
        return ['netflix', 'streamz', 'disney', 'sport', 'cinema', 'hbo']
            .filter(productId => this.state[productId].enabled).length;
    }

    updateAllEntertainmentSubtitles() {
        const products = ['netflix', 'streamz', 'disney', 'sport', 'cinema', 'hbo'];

        products.forEach(productId => {
            const subtitleElement = document.getElementById(`${productId}-subtitle`);
            if (subtitleElement && this.entertainmentData) {
                this.updateEntertainmentSubtitle(productId);
            }
        });
    }

    refreshAllEntertainmentProductInfo() {
        const products = ['netflix', 'streamz', 'disney', 'sport', 'cinema', 'hbo'];

        products.forEach(productId => {
            if (this.state[productId].enabled) {
                if (productId === 'netflix' || productId === 'streamz' || productId === 'hbo') {
                    this.updateEntertainmentTierInfo(productId);
                } else {
                    this.updateEntertainmentProductInfo(productId);
                }
            }
        });
    }

    updateEntertainmentSubtitle(productType) {
        const subtitleElement = document.getElementById(`${productType}-subtitle`);
        if (!subtitleElement || !this.entertainmentData) return;

        const productData = this.entertainmentData.entertainment[productType];
        if (!productData) return;

        if (productType === 'netflix' || productType === 'streamz') {
            const minPrice = Math.min(...productData.tiers.map(tier => this.getEntertainmentDiscountedPrice(tier.price)));
            subtitleElement.textContent = `Vanaf €${minPrice.toFixed(2).replace('.', ',')}`;
        } else {
            const discountPrice = this.getEntertainmentDiscountedPrice(productData.price);
            subtitleElement.textContent = `€${discountPrice.toFixed(2).replace('.', ',')}`;
        }
    }

    // Calculation methods
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

        // Entertainment costs
        const entertainmentTotal = this.calculateEntertainmentTotal();
        total += entertainmentTotal.total;
        totalPermanentDiscount += entertainmentTotal.totalDiscount;

        const totalDiscount = totalPermanentDiscount + totalTemporaryDiscount;

        return { 
            total, 
            totalDiscount, 
            totalPermanentDiscount, 
            totalTemporaryDiscount 
        };
    }

    calculateEntertainmentTotal() {
        let total = 0;
        let totalDiscount = 0;
        const enabledProducts = this.getEnabledEntertainmentProductsCount();
        const hasComboDiscount = enabledProducts >= this.entertainmentData.discounts.entertainment_combo.minProducts;

        // Netflix
        if (this.state.netflix.enabled) {
            const tier = this.entertainmentData.entertainment.netflix.tiers.find(t => t.id === this.state.netflix.selectedTier);
            const discountedPrice = this.getEntertainmentDiscountedPrice(tier.price);
            total += discountedPrice;
            if (hasComboDiscount) {
                totalDiscount += tier.price - discountedPrice;
            }
        }

        // Streamz
        if (this.state.streamz.enabled) {
            const tier = this.entertainmentData.entertainment.streamz.tiers.find(t => t.id === this.state.streamz.selectedTier);
            const discountedPrice = this.getEntertainmentDiscountedPrice(tier.price);
            total += discountedPrice;
            if (hasComboDiscount) {
                totalDiscount += tier.price - discountedPrice;
            }
        }

        // HBO
        if (this.state.hbo.enabled) {
            const tier = this.entertainmentData.entertainment.hbo.tiers.find(t => t.id === this.state.hbo.selectedTier);
            const discountedPrice = this.getEntertainmentDiscountedPrice(tier.price);
            total += discountedPrice;
            if (hasComboDiscount) {
                totalDiscount += tier.price - discountedPrice;
            }
        }

        // Disney
        if (this.state.disney.enabled) {
            const discountedPrice = this.getEntertainmentDiscountedPrice(this.entertainmentData.entertainment.disney.price);
            total += discountedPrice;
            if (hasComboDiscount) {
                totalDiscount += this.entertainmentData.entertainment.disney.price - discountedPrice;
            }
        }

        // Sport
        if (this.state.sport.enabled) {
            const discountedPrice = this.getEntertainmentDiscountedPrice(this.entertainmentData.entertainment.sport.price);
            total += discountedPrice;
            if (hasComboDiscount) {
                totalDiscount += this.entertainmentData.entertainment.sport.price - discountedPrice;
            }
        }

        // Cinema
        if (this.state.cinema.enabled) {
            const discountedPrice = this.getEntertainmentDiscountedPrice(this.entertainmentData.entertainment.cinema.price);
            total += discountedPrice;
            if (hasComboDiscount) {
                totalDiscount += this.entertainmentData.entertainment.cinema.price - discountedPrice;
            }
        }

        return { total, totalDiscount };
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

        // Update product overview
        this.updateProductOverview();

        // Update mobile summary
        this.updateMobileSummary();
    }

    toggleProductOverview() {
        const content = document.getElementById('product-overview-content');
        const arrow = document.getElementById('toggle-arrow');

        if (content.style.display === 'none') {
            content.style.display = 'block';
            arrow.classList.add('rotated');
        } else {
            content.style.display = 'none';
            arrow.classList.remove('rotated');
        }
    }

    updateProductOverview() {
        const content = document.getElementById('product-overview-content');
        const overviewSection = document.querySelector('.product-overview-section');
        let html = '';

        // Check if any products are enabled
        const hasAnyProducts = this.state.internet.enabled || 
                              this.state.mobile.enabled || 
                              this.state.tv.enabled || 
                              this.state.fixedPhone.enabled ||
                              this.state.netflix.enabled ||
                              this.state.streamz.enabled ||
                              this.state.disney.enabled ||
                              this.state.sport.enabled ||
                              this.state.cinema.enabled;

        // Hide the section if no products are enabled
        if (!hasAnyProducts) {
            overviewSection.style.display = 'none';
            return;
        } else {
            overviewSection.style.display = 'block';
        }

        // Internet
        if (this.state.internet.enabled) {
            const internetTier = this.data.products.internet.tiers.find(t => t.id === this.state.internet.selectedTier);
            let finalPrice = internetTier.price;
            if (internetTier.discountValue) {
                finalPrice = internetTier.price - internetTier.discountValue;
            }

            html += `
                <div class="overview-group">
                    <div class="overview-group-title">Internet</div>
                    <div class="overview-item">
                        <div class="overview-item-name">${internetTier.title}</div>
                        <div class="overview-item-price">
                            ${internetTier.discountValue ? 
                                `<span class="original-price">€ ${internetTier.price.toFixed(2).replace('.', ',')}</span>
                                 <span class="discount-price">€ ${finalPrice.toFixed(2).replace('.', ',')}</span>
                                 <span class="discount-info">- €${internetTier.discountValue.toFixed(2).replace('.', ',')} voor ${internetTier.discountPeriod} maanden</span>` :
                                `€ ${finalPrice.toFixed(2).replace('.', ',')}`
                            }
                        </div>
                    </div>
                </div>
            `;
        }

        // Mobile numbers
        if (this.state.mobile.enabled && this.state.mobile.simcards.length > 0) {
            html += `
                <div class="overview-group">
                    <div class="overview-group-title">Mobiele nummers</div>
            `;

            this.state.mobile.simcards.forEach((simcard, index) => {
                const mobileTier = this.data.products.mobile.tiers.find(t => t.id === simcard.selectedTier);
                const discountCalc = this.calculateMobileDiscount(mobileTier, index);

                html += `
                    <div class="overview-item">
                        <div class="overview-item-name">Simkaart ${index + 1} - ${mobileTier.title}</div>
                        <div class="overview-item-price">
                            ${discountCalc.hasDiscount ? 
                                `<span class="original-price">€ ${mobileTier.price.toFixed(2).replace('.', ',')}</span>
                                 <span class="discount-price">€ ${discountCalc.finalPrice.toFixed(2).replace('.', ',')}</span>
                                 <span class="discount-info">${discountCalc.permanentDiscountAmount > 0 ? 'Combovoordeel 50%' : ''}${discountCalc.temporaryDiscountAmount > 0 ? (discountCalc.permanentDiscountAmount > 0 ? ' + ' : '') + `€${discountCalc.temporaryDiscountAmount.toFixed(2).replace('.', ',')} voor ${mobileTier.discountPeriod} mnd` : ''}</span>` :
                                `€ ${discountCalc.finalPrice.toFixed(2).replace('.', ',')}`
                            }
                        </div>
                    </div>
                `;
            });

            html += `</div>`;
        }

        // Fixed phone
        if (this.state.fixedPhone.enabled) {
            const phoneData = this.data.products.fixedPhone;
            html += `
                <div class="overview-group">
                    <div class="overview-group-title">Vaste lijn</div>
                    <div class="overview-item">
                        <div class="overview-item-name">Vaste lijn</div>
                        <div class="overview-item-price">€ ${phoneData.price.toFixed(2).replace('.', ',')}</div>
                    </div>
                </div>
            `;
        }

        // Entertainment (TV + Entertainment Box + Entertainment products)
        const hasEntertainment = this.state.tv.enabled || 
                                 this.state.netflix.enabled || 
                                 this.state.streamz.enabled || 
                                 this.state.disney.enabled || 
                                 this.state.sport.enabled || 
                                 this.state.cinema.enabled;

        if (hasEntertainment) {
            html += `
                <div class="overview-group">
                    <div class="overview-group-title">Entertainment</div>
            `;

            // TV
            if (this.state.tv.enabled) {
                const tvData = this.data.products.tv;
                let tvFinalPrice = tvData.price;
                if (tvData.discountValue) {
                    tvFinalPrice = tvData.price - tvData.discountValue;
                }

                html += `
                    <div class="overview-item">
                        <div class="overview-item-name">TV</div>
                        <div class="overview-item-price">
                            ${tvData.discountValue ? 
                                `<span class="original-price">€ ${tvData.price.toFixed(2).replace('.', ',')}</span>
                                 <span class="discount-price">€ ${tvFinalPrice.toFixed(2).replace('.', ',')}</span>
                                 <span class="discount-info">- €${tvData.discountValue.toFixed(2).replace('.', ',')} voor ${tvData.discountPeriod} maanden</span>` :
                                `€ ${tvFinalPrice.toFixed(2).replace('.', ',')}`
                            }
                        </div>
                    </div>
                `;

                // Entertainment Box
                const entertainmentBoxTier = tvData.entertainmentBox.tiers.find(t => t.id === this.state.tv.entertainmentBoxTier);
                if (entertainmentBoxTier && entertainmentBoxTier.price !== undefined) {
                    let boxFinalPrice = entertainmentBoxTier.price;
                    if (entertainmentBoxTier.discountValue !== undefined) {
                        boxFinalPrice = entertainmentBoxTier.price - entertainmentBoxTier.discountValue;
                    }

                    html += `
                        <div class="overview-item">
                            <div class="overview-item-name">Entertainment Box</div>
                            <div class="overview-item-price">
                                ${entertainmentBoxTier.discountValue !== undefined ? 
                                    `<span class="original-price">€ ${entertainmentBoxTier.price.toFixed(2).replace('.', ',')}</span>
                                     <span class="discount-price">€ ${boxFinalPrice.toFixed(2).replace('.', ',')}</span>
                                     <span class="discount-info">- €${entertainmentBoxTier.discountValue.toFixed(2).replace('.', ',')} voor ${entertainmentBoxTier.discountPeriod} maanden</span>` :
                                    `€ ${boxFinalPrice.toFixed(2).replace('.', ',')}`
                                }
                            </div>
                        </div>
                    `;
                }
            }

            // Entertainment products
            const entertainmentProducts = [
                { key: 'netflix', name: 'Netflix' },
                { key: 'streamz', name: 'Streamz' },
                { key: 'disney', name: 'Disney+' },
                { key: 'sport', name: 'Sport' },
                { key: 'cinema', name: 'Cinema' }
            ];

            entertainmentProducts.forEach(product => {
                if (this.state[product.key].enabled) {
                    const productData = this.entertainmentData.entertainment[product.key];
                    let productName = product.name;
                    let originalPrice, finalPrice;

                    if (product.key === 'netflix' || product.key === 'streamz') {
                        const tier = productData.tiers.find(t => t.id === this.state[product.key].selectedTier);
                        productName += ` - ${tier.title}`;
                        originalPrice = tier.price;
                    } else {
                        originalPrice = productData.price;
                    }

                    finalPrice = this.getEntertainmentDiscountedPrice(originalPrice);
                    const hasDiscount = finalPrice < originalPrice;

                    html += `
                        <div class="overview-item">
                            <div class="overview-item-name">${productName}</div>
                            <div class="overview-item-price">
                                ${hasDiscount ? 
                                    `<span class="original-price">€ ${originalPrice.toFixed(2).replace('.', ',')}</span>
                                     <span class="discount-price">€ ${finalPrice.toFixed(2).replace('.', ',')}</span>
                                     <span class="discount-info">- €${(originalPrice - finalPrice).toFixed(2).replace('.', ',')} voor 6 maanden</span>` :
                                    `€ ${finalPrice.toFixed(2).replace('.', ',')}`
                                }
                            </div>
                        </div>
                    `;
                }
            });

            html += `</div>`;
        }

        content.innerHTML = html;
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
                    mobileSummary.classList.add('hidden');
                } else {
                    mobileSummary.classList.remove('hidden');
                }
            });
        }, {
            threshold: 0.1,
            rootMargin: '0px 0px -50px 0px'
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

    // Tooltip methods
    calculateTotalPermanentDiscount() {
        let totalPermanentDiscount = 0;
        let discountsInfo = [];

        const permanentDiscount = this.data.discounts.permanent;

        // Mobile permanent discount
        if (this.state.mobile.enabled && this.state.internet.enabled && permanentDiscount.enabled) {
            this.state.mobile.simcards.forEach(simcard => {
                const mobileTier = this.data.products.mobile.tiers.find(t => t.id === simcard.selectedTier);
                if (permanentDiscount.conditions.applicableToTiers.includes(mobileTier.id)) {
                    const discountAmount = mobileTier.price * (permanentDiscount.percentage / 100);
                    totalPermanentDiscount += discountAmount;
                    discountsInfo.push({
                        product: `Simkaart ${simcard.id}`,
                        percentage: permanentDiscount.percentage,
                        productName: mobileTier.title
                    });
                }
            });
        }

        // Entertainment permanent discounts (5% combo discount)
        const entertainmentTotal = this.calculateEntertainmentTotal();
        if (entertainmentTotal.totalDiscount > 0) {
            // Add individual entertainment product discounts
            if (this.state.netflix.enabled) {
                const tier = this.entertainmentData.entertainment.netflix.tiers.find(t => t.id === this.state.netflix.selectedTier);
                const discountedPrice = this.getEntertainmentDiscountedPrice(tier.price);
                if (discountedPrice < tier.price) {
                    const discountAmount = (tier.price - discountedPrice) * 12;
                    totalPermanentDiscount += discountAmount;
                    discountsInfo.push({
                        product: 'Netflix',
                        percentage: 5,
                        productName: 'Netflix'
                    });
                }
            }

            if (this.state.streamz.enabled) {
                const tier = this.entertainmentData.entertainment.streamz.tiers.find(t => t.id === this.state.streamz.selectedTier);
                const discountedPrice = this.getEntertainmentDiscountedPrice(tier.price);
                if (discountedPrice < tier.price) {
                    const discountAmount = (tier.price - discountedPrice) * 12;
                    totalPermanentDiscount += discountAmount;
                    discountsInfo.push({
                        product: 'Streamz',
                        percentage: 5,
                        productName: 'Streamz'
                    });
                }
            }

            if (this.state.disney.enabled) {
                const discountedPrice = this.getEntertainmentDiscountedPrice(this.entertainmentData.entertainment.disney.price);
                if (discountedPrice < this.entertainmentData.entertainment.disney.price) {
                    const discountAmount = (this.entertainmentData.entertainment.disney.price - discountedPrice) * 12;
                    totalPermanentDiscount += discountAmount;
                    discountsInfo.push({
                        product: 'Disney+',
                        percentage: 5,
                        productName: 'Disney+'
                    });
                }
            }

            if (this.state.sport.enabled) {
                const discountedPrice = this.getEntertainmentDiscountedPrice(this.entertainmentData.entertainment.sport.price);
                if (discountedPrice < this.entertainmentData.entertainment.sport.price) {
                    const discountAmount = (this.entertainmentData.entertainment.sport.price - discountedPrice) * 12;
                    totalPermanentDiscount += discountAmount;
                    discountsInfo.push({
                        product: 'Sport',
                        percentage: 5,
                        productName: 'Sport'
                    });
                }
            }

            if (this.state.cinema.enabled) {
                const discountedPrice = this.getEntertainmentDiscountedPrice(this.entertainmentData.entertainment.cinema.price);
                if (discountedPrice < this.entertainmentData.entertainment.cinema.price) {
                    const discountAmount = (this.entertainmentData.entertainment.cinema.price - discountedPrice) * 12;
                    totalPermanentDiscount += discountAmount;
                    discountsInfo.push({
                        product: 'Cinema',
                        percentage: 5,
                        productName: 'Cinema'
                    });
                }
            }
        } else {
            totalPermanentDiscount = totalPermanentDiscount * 12;
        }

        return {
            total: totalPermanentDiscount,
            discounts: discountsInfo
        };
    }

    calculateTotalTemporaryDiscount() {
        let totalTemporaryDiscount = 0;
        let discountsInfo = [];

        // Internet temporary discount
        if (this.state.internet.enabled) {
            const internetTier = this.data.products.internet.tiers.find(t => t.id === this.state.internet.selectedTier);
            if (internetTier.discountValue && internetTier.discountPeriod) {
                totalTemporaryDiscount += internetTier.discountValue * internetTier.discountPeriod;
                discountsInfo.push({
                    product: 'Internet',
                    discountValue: internetTier.discountValue,
                    discountPeriod: internetTier.discountPeriod
                });
            }
        }

        // Mobile temporary discounts
        if (this.state.mobile.enabled) {
            this.state.mobile.simcards.forEach((simcard, index) => {
                const mobileTier = this.data.products.mobile.tiers.find(t => t.id === simcard.selectedTier);
                if (mobileTier.discountValue && mobileTier.discountPeriod && index >= 1) {
                    totalTemporaryDiscount += mobileTier.discountValue * mobileTier.discountPeriod;
                    discountsInfo.push({
                        product: `Simkaart ${simcard.id}`,
                        discountValue: mobileTier.discountValue,
                        discountPeriod: mobileTier.discountPeriod
                    });
                }
            });
        }

        // TV temporary discount
        if (this.state.tv.enabled) {
            const tvData = this.data.products.tv;
            if (tvData.discountValue && tvData.discountPeriod) {
                totalTemporaryDiscount += tvData.discountValue * tvData.discountPeriod;
                discountsInfo.push({
                    product: 'TV',
                    discountValue: tvData.discountValue,
                    discountPeriod: tvData.discountPeriod
                });
            }

            // Entertainment Box temporary discount
            const entertainmentBoxTier = tvData.entertainmentBox.tiers.find(t => t.id === this.state.tv.entertainmentBoxTier);
            if (entertainmentBoxTier && entertainmentBoxTier.discountValue && entertainmentBoxTier.discountPeriod) {
                totalTemporaryDiscount += entertainmentBoxTier.discountValue * entertainmentBoxTier.discountPeriod;
                discountsInfo.push({
                    product: 'Entertainment Box',
                    discountValue: entertainmentBoxTier.discountValue,
                    discountPeriod: entertainmentBoxTier.discountPeriod
                });
            }
        }

        // Entertainment permanent discounts are handled separately in calculateTotalPermanentDiscount

        return {
            total: totalTemporaryDiscount,
            discounts: discountsInfo
        };
    }

    openTooltipSheet(tooltipKey) {
        const tooltipData = this.data.tooltips[tooltipKey];
        if (!tooltipData) return;

        const overlay = document.getElementById('sheet-overlay');
        const title = document.getElementById('sheet-title');
        const body = document.getElementById('sheet-body');

        let content = tooltipData.content;

        if (tooltipKey === 'permanent_promotion') {
            const permanentData = this.calculateTotalPermanentDiscount();
            content = `<p>Een permanente korting blijft geldig zolang je contract duurt en aan de voorwaarden voldaan wordt.</p>
            <h4>Overzicht kortingen</h4>
            <ul>
                ${permanentData.discounts.map(discount => `<li><strong>${discount.percentage}% korting</strong> op <strong>${discount.productName}</strong></li>`).join('')}
            </ul>
            <div class="highlight">Totale korting voor 1 jaar: € ${permanentData.total.toFixed(2).replace('.', ',')} </div>`;
        } else if (tooltipKey === 'temporary_promotion') {
            const temporaryData = this.calculateTotalTemporaryDiscount();
            content = `<h4>Overzicht</h4>
            <ul>
                ${temporaryData.discounts.map(discount => `<li><strong>€ ${discount.discountValue} korting</strong> voor <strong>${discount.discountPeriod} maanden</strong></li>`).join('')}
            </ul>
            <div class="highlight"> Totale tijdelijke korting: € ${temporaryData.total.toFixed(2).replace('.', ',')}</div>`;
        }

        title.innerHTML = tooltipData.title;
        body.innerHTML = content;

        overlay.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }

    closeTooltipSheet() {
        const overlay = document.getElementById('sheet-overlay');
        overlay.style.display = 'none';
        document.body.style.overflow = '';
    }

    // Entertainment specific methods
    openEntertainmentBottomSheet() {
        const overlay = document.getElementById('entertainment-sheet-overlay');
        overlay.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }

    closeEntertainmentBottomSheet() {
        const overlay = document.getElementById('entertainment-sheet-overlay');
        overlay.style.display = 'none';
        document.body.style.overflow = '';
    }

    renderAvailableEntertainmentServices() {
        const container = document.getElementById('available-services-grid');
        if (!container || !this.entertainmentData) return;

        const services = [
            { key: 'netflix', name: 'Netflix', icon: 'N', iconClass: 'netflix-icon' },
            { key: 'disney', name: 'Disney+', icon: 'D+', iconClass: 'disney-icon' },
            { key: 'hbo', name: 'HBO Max', icon: 'HBO', iconClass: 'hbo-icon' },
            { key: 'streamz', name: 'Streamz', icon: 'S', iconClass: 'streamz-icon' },
            { key: 'sport', name: 'Sport', icon: '⚽', iconClass: 'sport-icon' },
            { key: 'cinema', name: 'Cinema', icon: '🎬', iconClass: 'cinema-icon' }
        ];

        container.innerHTML = services
            .filter(service => !this.state.selectedEntertainmentServices.has(service.key))
            .map(service => {
                const serviceData = this.entertainmentData.entertainment[service.key];
                let priceText;

                if (serviceData.tiers) {
                    const minPrice = Math.min(...serviceData.tiers.map(tier => this.getEntertainmentDiscountedPrice(tier.price)));
                    priceText = `Vanaf € ${minPrice.toFixed(2).replace('.', ',')}`;
                } else {
                    const discountPrice = this.getEntertainmentDiscountedPrice(serviceData.price);
                    priceText = `€ ${discountPrice.toFixed(2).replace('.', ',')}`;
                }

                return `
                    <div class="available-service" onclick="app.addEntertainmentService('${service.key}')">
                        <div class="service-icon ${service.iconClass}">${service.icon}</div>
                        <div class="available-service-content">
                            <div class="available-service-name">${service.name}</div>
                            <div class="available-service-price">${priceText}</div>
                        </div>
                        <div class="add-service-icon">+</div>
                    </div>
                `;
            }).join('');
    }

    renderSelectedEntertainmentServices() {
        const container = document.getElementById('selected-entertainment-services');
        const comboDiscountBanner = document.getElementById('combo-discount-banner');

        if (!container || !this.entertainmentData) return;

        const selectedServices = Array.from(this.state.selectedEntertainmentServices);

        // Show/hide combo discount banner
        if (selectedServices.length >= 2) {
            comboDiscountBanner.style.display = 'flex';
        } else {
            comboDiscountBanner.style.display = 'none';
        }

        // Clear existing selected services (but keep the banner)
        const existingServices = container.querySelectorAll('.selected-service');
        existingServices.forEach(service => service.remove());

        selectedServices.forEach(serviceKey => {
            const serviceData = this.entertainmentData.entertainment[serviceKey];
            const serviceName = this.getServiceDisplayName(serviceKey);
            const iconClass = this.getServiceIconClass(serviceKey);
            const icon = this.getServiceIcon(serviceKey);

            const serviceElement = document.createElement('div');
            serviceElement.className = 'selected-service';
            serviceElement.innerHTML = `
                <div class="selected-service-header">
                    <div class="selected-service-title">
                        <div class="service-icon ${iconClass}">${icon}</div>
                        ${serviceName}
                    </div>
                    <button class="remove-service" onclick="app.removeEntertainmentService('${serviceKey}')">🗑️</button>
                </div>
                ${this.renderServiceTiers(serviceKey)}
                ${this.renderServiceDetails(serviceKey)}
                ${this.renderServicePrice(serviceKey)}
            `;

            container.appendChild(serviceElement);
        });
    }

    getServiceDisplayName(serviceKey) {
        const names = {
            'netflix': 'Netflix',
            'streamz': 'Streamz',
            'disney': 'Disney+',
            'sport': 'Sport',
            'cinema': 'Cinema',
            'hbo': 'HBO Max'
        };
        return names[serviceKey] || serviceKey;
    }

    getServiceIconClass(serviceKey) {
        const classes = {
            'netflix': 'netflix-icon',
            'streamz': 'streamz-icon',
            'disney': 'disney-icon',
            'sport': 'sport-icon',
            'cinema': 'cinema-icon',
            'hbo': 'hbo-icon'
        };
        return classes[serviceKey] || '';
    }

    getServiceIcon(serviceKey) {
        const icons = {
            'netflix': 'N',
            'streamz': 'S',
            'disney': 'D+',
            'sport': '⚽',
            'cinema': '🎬',
            'hbo': 'HBO'
        };
        return icons[serviceKey] || '';
    }

    renderServiceTiers(serviceKey) {
        const serviceData = this.entertainmentData.entertainment[serviceKey];

        if (!serviceData.tiers) return '';

        return `
            <div class="service-tier-selector">
                ${serviceData.tiers.map(tier => {
                    const discountedPrice = this.getEntertainmentDiscountedPrice(tier.price);
                    const priceText = `€${discountedPrice.toFixed(2).replace('.', ',')}`;

                    return `
                        <div class="service-tier-option ${tier.id === this.state[serviceKey].selectedTier ? 'active' : ''}" 
                             onclick="app.selectEntertainmentServiceTier('${serviceKey}', ${tier.id})">
                            <div class="tier-title">${tier.title}</div>
                            <div class="tier-subtitle">${priceText}</div>
                        </div>
                    `;
                }).join('')}
            </div>
        `;
    }

    renderServiceDetails(serviceKey) {
        const serviceData = this.entertainmentData.entertainment[serviceKey];
        let summary;

        if (serviceData.tiers) {
            const tier = serviceData.tiers.find(t => t.id === this.state[serviceKey].selectedTier);
            summary = tier.summary;
        } else {
            summary = serviceData.summary;
        }

        const summaryItems = summary.split(', ').map(item => `<li>${item}</li>`).join('');

        return `
            <div class="service-details">
                <ul>${summaryItems}</ul>
            </div>
        `;
    }

    renderServicePrice(serviceKey) {
        const serviceData = this.entertainmentData.entertainment[serviceKey];
        let originalPrice;

        if (serviceData.tiers) {
            const tier = serviceData.tiers.find(t => t.id === this.state[serviceKey].selectedTier);
            originalPrice = tier.price;
        } else {
            originalPrice = serviceData.price;
        }

        const discountedPrice = this.getEntertainmentDiscountedPrice(originalPrice);
        const hasDiscount = discountedPrice < originalPrice;

        if (hasDiscount) {
            return `
                <div class="service-price-container">
                    <div class="service-original-price">€ ${originalPrice.toFixed(2).replace('.', ',')}</div>
                    <div class="service-discount-price">€ ${discountedPrice.toFixed(2).replace('.', ',')}/maand</div>
                    <div class="service-discount-info">5% combinatiekorting</div>
                </div>
            `;
        } else {
            return `
                <div class="service-price-container">
                    <div class="service-price">€ ${originalPrice.toFixed(2).replace('.', ',')}/maand</div>
                </div>
            `;
        }
    }

    addEntertainmentService(serviceKey) {
        this.state.selectedEntertainmentServices.add(serviceKey);
        this.state[serviceKey].enabled = true;

        // Set default tier for services with tiers
        const serviceData = this.entertainmentData.entertainment[serviceKey];
        if (serviceData.tiers && serviceData.defaultTier) {
            this.state[serviceKey].selectedTier = serviceData.defaultTier;
        }

        this.renderAvailableEntertainmentServices();
        this.renderSelectedEntertainmentServices();
        this.updateAllEntertainmentSubtitles();
        this.updateCostSummary();
    }

    removeEntertainmentService(serviceKey) {
        this.state.selectedEntertainmentServices.delete(serviceKey);
        this.state[serviceKey].enabled = false;

        this.renderAvailableEntertainmentServices();
        this.renderSelectedEntertainmentServices();
        this.updateAllEntertainmentSubtitles();
        this.updateCostSummary();
    }

    selectEntertainmentServiceTier(serviceKey, tierId) {
        this.state[serviceKey].selectedTier = tierId;
        this.renderSelectedEntertainmentServices();
        this.updateAllEntertainmentSubtitles();
        this.updateCostSummary();
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



    scrollToEntertainmentBox() {
        const entertainmentBoxBlock = document.getElementById('entertainment-box-block');
        if (entertainmentBoxBlock) {
            entertainmentBoxBlock.scrollIntoView({
                behavior: 'smooth',
                block: 'center'
            });

            // Add a subtle highlight effect
            entertainmentBoxBlock.style.transition = 'background-color 0.3s ease';
            entertainmentBoxBlock.style.backgroundColor = '#f8f9fa';

            setTimeout(() => {
                entertainmentBoxBlock.style.backgroundColor = '';
            }, 1000);
        }
    }
}

// Initialize the app
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new UnifiedConfigurator();
});