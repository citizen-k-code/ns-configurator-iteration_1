
class UnifiedConfigurator {
    constructor() {
        this.data = null;
        this.entertainmentData = null;
        this.currentSection = 'telecom'; // 'telecom' or 'entertainment'
        this.state = {
            // Telecom state
            internet: {
                enabled: false,
                selectedTier: 1,
                wifiPods: 0
            },
            mobile: {
                enabled: false,
                simcards: []
            },
            tv: {
                enabled: false,
                entertainmentBoxTier: 1
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
            this.renderClosedStatesForDisabledProducts();
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
                    this.renderWifiPods();
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
                this.renderEntertainmentBoxTiers();

                // Auto-check the TV checkbox since Entertainment Box is enabled by default with TV
                const tvCheckbox = document.getElementById('tv-entertainment-box-checkbox');
                if (tvCheckbox) {
                    tvCheckbox.checked = true;
                }

                // Enable Entertainment Box by default when TV is enabled via URL
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

        // TV Entertainment Box checkbox
        const tvEntertainmentBoxCheckbox = document.getElementById('tv-entertainment-box-checkbox');
        if (tvEntertainmentBoxCheckbox) {
            tvEntertainmentBoxCheckbox.addEventListener('change', (e) => {
                const entertainmentBoxToggle = document.getElementById('entertainment-box-toggle');
                if (entertainmentBoxToggle) {
                    entertainmentBoxToggle.checked = e.target.checked;
                    this.toggleProduct('entertainmentBox', e.target.checked);
                }
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

                // Sync the TV checkbox when Entertainment Box is toggled
                const tvCheckbox = document.getElementById('tv-entertainment-box-checkbox');
                if (tvCheckbox && this.state.tv.enabled) {
                    tvCheckbox.checked = e.target.checked;
                }
            });
        }

        // Product header click listeners
        this.setupProductHeaderListeners();

        // Advantage block click listener
        const advantageBlock = document.getElementById('advantage-block');
        if (advantageBlock) {
            advantageBlock.addEventListener('click', () => {
                this.openAdvantageBottomSheet();
            });
        }
    }

    setupMobileSummaryObserver() {
        // This method exists to maintain compatibility
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
            if (mainOrderBtn) mainOrderBtn.textContent = 'Verder';
            if (mobileOrderBtn) mobileOrderBtn.textContent = 'Verder';
        } else {
            if (mainOrderBtn) mainOrderBtn.textContent = 'Bestellen';
            if (mobileOrderBtn) mobileOrderBtn.textContent = 'Bestellen';
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
                // Remove any existing closed state
                this.removeProductClosedState(productType);
                if (content) content.style.display = 'block';
                if (productType === 'internet') {
                    this.renderInternetTiers();
                    this.state.internet.selectedTier = this.data.products.internet.defaultTier;
                    this.state.internet.wifiPods = 0;
                    this.updateInternetInfo();
                    this.renderWifiPods();
                    if (this.state.mobile.enabled) {
                        this.renderMobileSimcards();
                        this.updateMobileHighlightBlock();
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

                    // Auto-check the TV checkbox since Entertainment Box is enabled by default
                    const tvCheckbox = document.getElementById('tv-entertainment-box-checkbox');
                    if (tvCheckbox) {
                        tvCheckbox.checked = true;
                    }

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
                if (content) content.style.display = 'none';
                if (productType === 'mobile') {
                    this.state.mobile.simcards = [];
                    this.updateMobileHighlightBlock();
                } else if (productType === 'internet') {
                    if (this.state.mobile.enabled) {
                        this.renderMobileSimcards();
                        this.updateMobileHighlightBlock();
                    }
                }
                // Render closed state for telecom products
                this.renderProductClosedState(productType);
            }
            this.updateHighlightBlocks();
        }
        // Handle main entertainment toggle
        else if (productType === 'entertainment') {
            const content = document.getElementById('entertainment-content');
            const closedState = document.getElementById('entertainment-closed-state');

            if (enabled) {
                // Remove any existing closed state
                this.removeProductClosedState(productType);
                if (content) content.style.display = 'block';
                if (closedState) {
                    closedState.style.display = 'none';
                }
                this.renderAvailableEntertainmentServices();
                this.renderSelectedEntertainmentServices();

                // Smooth scroll to ensure the product block is visible
                setTimeout(() => {
                    const productBlock = document.getElementById('entertainment-block');
                    this.scrollToElementSmooth(productBlock);
                }, 100);
            } else {
                if (content) content.style.display = 'none';
                if (closedState) {
                    closedState.style.display = 'block';
                }
                // Clear all selected entertainment services
                this.state.selectedEntertainmentServices.clear();
                ['netflix', 'streamz', 'disney', 'sport', 'cinema', 'hbo'].forEach(service => {
                    this.state[service].enabled = false;
                });
                // Render closed state for entertainment
                this.renderProductClosedState('entertainment');
            }
        }
        // Handle entertainment box toggle
        else if (productType === 'entertainmentBox') {
            const content = document.getElementById('entertainment-box-content');

            if (enabled) {
                this.removeProductClosedState('entertainmentBox');
                if (content) content.style.display = 'block';
                this.updateEntertainmentBoxStandaloneInfo();

                // Smooth scroll to ensure the product block is visible
                setTimeout(() => {
                    const productBlock = document.getElementById('entertainment-box-block');
                    this.scrollToElementSmooth(productBlock);
                }, 100);
            } else {
                if (content) content.style.display = 'none';
                this.renderProductClosedState('entertainmentBox');
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

        tiersContainer.innerHTML = tiers.map(tier => {
            const isSelected = tier.id === this.state.internet.selectedTier;
            let finalPrice = tier.price;
            let hasDiscount = false;

            if (tier.discountValue) {
                finalPrice = tier.price - tier.discountValue;
                hasDiscount = true;
            }

            let subtitleContent = '';
            if (!isSelected) {
                if (hasDiscount) {
                    subtitleContent = `<div class="tier-subtitle promotional-price">€${finalPrice.toFixed(2).replace('.', ',')}</div>`;
                } else {
                    subtitleContent = `<div class="tier-subtitle">€${finalPrice.toFixed(2).replace('.', ',')}</div>`;
                }
            }

            return `
                <div class="tier-option ${isSelected ? 'active' : ''}" 
                     onclick="app.selectInternetTier(${tier.id})">
                    <div class="tier-title">${tier.title}</div>
                    ${subtitleContent}
                </div>
            `;
        }).join('');
    }

    selectInternetTier(tierId) {
        this.state.internet.selectedTier = tierId;
        this.renderInternetTiers();
        this.updateInternetInfo();
        if (this.state.mobile.enabled) {
            this.renderMobileSimcards();
            this.updateMobileHighlightBlock();
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
            // Temporary discount: show promo badge and strikethrough with caption
            const discountPrice = tier.price - tier.discountValue;
            const promoBadge = tier.promoName ? `<span class="promo-badge">${tier.promoName}</span>` : '';
            priceHtml = `
                <div class="tier-price-container">
                    <div class="price-with-badge">
                        ${promoBadge}
                        <div class="price-content">
                            <div class="original-price">€ ${tier.price.toFixed(2).replace('.', ',')}</div>
                            <div class="discount-price">€ ${discountPrice.toFixed(2).replace('.', ',')}/maand</div>
                        </div>
                    </div>
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
            <div class="wifi-pods-section">
                <hr class="section-divider">
                <div id="wifi-pods-container"></div>
            </div>
        `;
    }

    renderWifiPods() {
        const container = document.getElementById('wifi-pods-container');
        if (!container || !this.data) return;

        const wifiPodsData = this.data.products.internet.wifiPods;
        const currentPods = this.state.internet.wifiPods;

        let contentHtml = '';

        if (currentPods === 0) {
            contentHtml = `
                <div class="wifi-pods-free-trial">
                    <div class="free-trial-title">Probeer het gratis uit</div>
                    <div class="free-trial-text">${wifiPodsData.freeTrialText}</div>
                </div>
            `;
        } else {
            const originalPrice = currentPods * wifiPodsData.pricePerPod;
            const discountedPrice = 0; // Free for 3 months
            const promoBadge = `<span class="promo-badge">${wifiPodsData.promoName}</span>`;

            contentHtml = `
                <div class="wifi-pods-pricing">
                    <div class="price-with-badge">
                        ${promoBadge}
                        <div class="price-content">
                            <div class="original-price">€ ${originalPrice.toFixed(2).replace('.', ',')}</div>
                            <div class="discount-price">€ ${discountedPrice.toFixed(2).replace('.', ',')}/maand</div>
                        </div>
                    </div>
                    <div class="discount-info">gedurende ${wifiPodsData.discountPeriod} maanden</div>
                </div>
            `;
        }

        container.innerHTML = `
            <div class="wifi-pods-header">
                <div class="wifi-pods-title">${wifiPodsData.title}</div>
                <div class="tooltip-link" onclick="app.openTooltipSheet('wifi_pods')">${wifiPodsData.tooltip}</div>
            </div>
            <div class="wifi-pods-stepper">
                <button class="stepper-btn" onclick="app.decreaseWifiPods()" ${currentPods === 0 ? 'disabled' : ''}>−</button>
                <span class="stepper-value">${currentPods}</span>
                <button class="stepper-btn" onclick="app.increaseWifiPods()" ${currentPods >= wifiPodsData.maxPods ? 'disabled' : ''}>+</button>
            </div>
            ${contentHtml}
        `;
    }

    increaseWifiPods() {
        const maxPods = this.data.products.internet.wifiPods.maxPods;
        if (this.state.internet.wifiPods < maxPods) {
            this.state.internet.wifiPods++;
            this.renderWifiPods();
            this.updateCostSummary();
        }
    }

    decreaseWifiPods() {
        if (this.state.internet.wifiPods > 0) {
            this.state.internet.wifiPods--;
            this.renderWifiPods();
            this.updateCostSummary();
        }
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
                    ${this.data.products.mobile.tiers.map(tier => {
                        const discountCalc = this.calculateMobileDiscount(tier, index);
                        const displayPrice = discountCalc.hasDiscount ? discountCalc.finalPrice : tier.price;
                        const isSelected = tier.id === simcard.selectedTier;

                        let subtitleContent = '';
                        if (!isSelected) {
                            if (discountCalc.hasDiscount) {
                                subtitleContent = `<div class="tier-subtitle promotional-price">€${displayPrice.toFixed(2).replace('.', ',')}</div>`;
                            } else {
                                subtitleContent = `<div class="tier-subtitle">€${displayPrice.toFixed(2).replace('.', ',')}</div>`;
                            }
                        }

                        return `
                            <div class="tier-option ${isSelected ? 'active' : ''}" 
                                 onclick="app.selectMobileTier(${simcard.id}, ${tier.id})">
                                <div class="tier-title">${tier.title}</div>
                                ${subtitleContent}
                            </div>
                        `;
                    }).join('')}
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

            if (permanentDiscountAmount > 0 && temporaryDiscountAmount > 0) {
                // Both permanent and temporary discount: use permanent discounted price as strikethrough
                const priceAfterPermanent = tier.price - permanentDiscountAmount;
                const promoBadge = tier.promoName ? `<span class="promo-badge">${tier.promoName}</span>` : '';
                const discountCopy = tier.discountCopy.both;

                priceHtml = `
                    <div class="tier-price-container">
                        <div class="price-with-badge">
                            ${promoBadge}
                            <div class="price-content">
                                <div class="original-price">€ ${priceAfterPermanent.toFixed(2).replace('.', ',')}</div>
                                <div class="discount-price">€ ${finalPrice.toFixed(2).replace('.', ',')}/maand</div>
                            </div>
                        </div>
                        <div class="discount-info">${discountCopy}</div>
                    </div>
                `;
            } else if (permanentDiscountAmount > 0) {
                // Only permanent discount: show only discounted price in pink, no strikethrough
                priceHtml = `<div class="tier-price permanent-discount">€ ${finalPrice.toFixed(2).replace('.', ',')}/maand</div>`;
            } else if (temporaryDiscountAmount > 0) {
                // Only temporary discount: show strikethrough with caption and promo badge
                const promoBadge = tier.promoName ? `<span class="promo-badge">${tier.promoName}</span>` : '';
                const discountCopy = tier.discountCopy.temporaryOnly;
                priceHtml = `
                    <div class="tier-price-container">
                        <div class="price-with-badge">
                            ${promoBadge}
                            <div class="price-content">
                                <div class="original-price">€ ${tier.price.toFixed(2).replace('.', ',')}</div>
                                <div class="discount-price">€ ${finalPrice.toFixed(2).replace('.', ',')}/maand</div>
                            </div>
                        </div>
                        <div class="discount-info">${discountCopy}</div>
                    </div>
                `;
            }
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
        const hasTemporaryDiscount = tier.discountValue && tier.discountPeriod;

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

        const summaryItems = tvData.summary.split(', ').map(item =>`<li>${item}</li>`).join('');

        // No temporary discount for TV anymore
        const priceHtml = `<div class="tier-price">€ ${tvData.price.toFixed(2).replace('.', ',')}/maand</div>`;

        infoContainer.innerHTML = `
            <ul class="tier-details">
                ${summaryItems}
            </ul>
            ${priceHtml}
        `;
    }

    renderEntertainmentBoxTiers() {
        const tiersContainer = document.getElementById('entertainment-box-tiers');
        if (!tiersContainer || !this.data) return;

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

        if (tier.id === 1 || !tier.summary) {
            if (infoContainer) {
                infoContainer.style.display = 'none';
                infoContainer.innerHTML = '';
            }
            return;
        }

        if (infoContainer) {
            infoContainer.style.display = 'block';

            const summaryItems = tier.summary.split(', ').map(item => `<li>${item}</li>`).join('');

            let priceHtml;
            if (tier.discountValue !== undefined && tier.discountPeriod) {
                // Temporary discount: show promo badge and strikethrough with caption
                const discountPrice = tier.price - tier.discountValue;
                const promoBadge = tier.promoName ? `<span class="promo-badge">${tier.promoName}</span>` : '';
                priceHtml = `
                    <div class="tier-price-container">
                        <div class="price-with-badge">
                            ${promoBadge}
                            <div class="price-content">
                                <div class="original-price">€ ${tier.price.toFixed(2).replace('.', ',')}</div>
                                <div class="discount-price">€ ${discountPrice.toFixed(2).replace('.', ',')}/maand</div>
                            </div>
                        </div>
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
    }

    updateEntertainmentBoxStandaloneInfo() {
        const entertainmentBoxData = this.data.products.entertainmentBox;
        const infoContainer = document.getElementById('entertainment-box-info');

        if (!infoContainer || !entertainmentBoxData) {
            return;
        }

        const summaryItems = entertainmentBoxData.summary.split(', ').map(item => `<li>${item}</li>`).join('');

        let priceHtml;
        if (entertainmentBoxData.discountValue && entertainmentBoxData.discountPeriod) {
            // Temporary discount: show promo badge and strikethrough with caption
            const discountPrice = entertainmentBoxData.price - entertainmentBoxData.discountValue;
            const promoBadge = entertainmentBoxData.promoName ? `<span class="promo-badge">${entertainmentBoxData.promoName}</span>` : '';
            priceHtml = `
                <div class="tier-price-container">
                    <div class="price-with-badge">
                        ${promoBadge}
                        <div class="price-content">
                            <div class="original-price">€ ${entertainmentBoxData.price.toFixed(2).replace('.', ',')}</div>
                            <div class="discount-price">€ ${discountPrice.toFixed(2).replace('.', ',')}/maand</div>
                        </div>
                    </div>
                    <div class="discount-info">${entertainmentBoxData.discountCopy.temporaryOnly}</div>
                </div>
            `;
        } else {
            priceHtml = `<div class="tier-price">€ ${entertainmentBoxData.price.toFixed(2).replace('.', ',')}/maand</div>`;
        }

        infoContainer.innerHTML = `
            <ul class="tier-details">
                ${summaryItems}
            </ul>
            ${priceHtml}
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
            const isSelected = tier.id === this.state[productType].selectedTier;
            let subtitleContent = '';

            if (!isSelected) {
                const discountedPrice = this.getEntertainmentDiscountedPrice(tier.price);
                const hasDiscount = discountedPrice < tier.price;
                const priceText = `€${discountedPrice.toFixed(2).replace('.', ',')}`;

                if (hasDiscount) {
                    subtitleContent = `<div class="tier-subtitle promotional-price">${priceText}</div>`;
                } else {
                    subtitleContent = `<div class="tier-subtitle">${priceText}</div>`;
                }
            }

            return `
                <div class="tier-option ${isSelected ? 'active' : ''}" 
                     onclick="app.selectEntertainmentTier('${productType}', ${tier.id})">
                    <div class="tier-title">${tier.title}</div>
                    ${subtitleContent}
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
            // Permanent discount: show only pink price without strikethrough
            priceHtml = `<div class="tier-price permanent-discount">€ ${discountPrice.toFixed(2).replace('.', ',')}/maand</div>`;
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
            // Permanent discount: show only pink price without strikethrough
            priceHtml = `<div class="tier-price permanent-discount">€ ${discountPrice.toFixed(2).replace('.', ',')}/maand</div>`;
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

            // WiFi pods cost
            if (this.state.internet.wifiPods > 0) {
                const wifiPodsData = this.data.products.internet.wifiPods;
                const podsOriginalPrice = this.state.internet.wifiPods * wifiPodsData.pricePerPod;
                const podsDiscountedPrice = 0; // Free for promotional period
                total += podsDiscountedPrice;
                totalTemporaryDiscount += podsOriginalPrice; // Full discount for promotional period
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

        // Entertainment Box cost (standalone)
        if (this.state.entertainmentBox.enabled && !this.state.tv.enabled) {
            const entertainmentBoxData = this.data.products.entertainmentBox;
            if (entertainmentBoxData && entertainmentBoxData.discountValue) {
                total += entertainmentBoxData.price - entertainmentBoxData.discountValue;
                totalTemporaryDiscount += entertainmentBoxData.discountValue;
            } else if (entertainmentBoxData) {
                total += entertainmentBoxData.price;
            }
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
                if (mobileTier.discountValue && mobileTier.discountPeriod) {
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

        // Entertainment Box temporary discount (standalone)
        if (this.state.entertainmentBox.enabled && !this.state.tv.enabled) {
            const entertainmentBoxData = this.data.products.entertainmentBox;
            if (entertainmentBoxData && entertainmentBoxData.discountValue && entertainmentBoxData.discountPeriod) {
                totalTemporaryDiscount += entertainmentBoxData.discountValue * entertainmentBoxData.discountPeriod;
                discountsInfo.push({
                    product: 'Entertainment Box',
                    discountValue: entertainmentBoxData.discountValue,
                    discountPeriod: entertainmentBoxData.discountPeriod
                });
            }
        }

        // Add WiFi pods discount period
        if (this.state.internet.enabled && this.state.internet.wifiPods > 0) {
            const wifiPodsData = this.data.products.internet.wifiPods;
            if (wifiPodsData.discountPeriod) {
                const podsOriginalPrice = this.state.internet.wifiPods * wifiPodsData.pricePerPod;
                totalTemporaryDiscount += podsOriginalPrice * wifiPodsData.discountPeriod;
                discountsInfo.push({
                    product: 'WiFi-pods',
                    discountValue: podsOriginalPrice,
                    discountPeriod: wifiPodsData.discountPeriod
                });
            }
        }

        return {
            total: totalTemporaryDiscount,
            discounts: discountsInfo
        };
    }

    calculateTotalPermanentDiscount() {
        let totalPermanentDiscount = 0;
        let discountsInfo = [];

        // Mobile permanent discounts
        if (this.state.mobile.enabled && this.state.internet.enabled) {
            const permanentDiscount = this.data.discounts.permanent;
            if (permanentDiscount.enabled) {
                this.state.mobile.simcards.forEach((simcard, index) => {
                    const mobileTier = this.data.products.mobile.tiers.find(t => t.id === simcard.selectedTier);
                    if (permanentDiscount.conditions.applicableToTiers.includes(mobileTier.id)) {
                        const discountAmount = mobileTier.price * (permanentDiscount.percentage / 100);
                        totalPermanentDiscount += discountAmount * 12; // Annual amount
                        discountsInfo.push({
                            productName: `Simkaart ${simcard.id}`,
                            percentage: permanentDiscount.percentage
                        });
                    }
                });
            }
        }

        // Entertainment combo discounts
        const entertainmentTotal = this.calculateEntertainmentTotal();
        if (entertainmentTotal.totalDiscount > 0) {
            totalPermanentDiscount += entertainmentTotal.totalDiscount * 12; // Annual amount
            const enabledProducts = this.getEnabledEntertainmentProductsCount();
            if (enabledProducts >= 2) {
                discountsInfo.push({
                    productName: 'Entertainment services',
                    percentage: this.entertainmentData.discounts.entertainment_combo.percentage
                });
            }
        }

        return {
            total: totalPermanentDiscount,
            discounts: discountsInfo
        };
    }

    getShortestTemporaryDiscountPeriod() {
        let shortestPeriod = 0;
        const periods = [];

        // Check all temporary discount periods
        if (this.state.internet.enabled) {
            const internetTier = this.data.products.internet.tiers.find(t => t.id === this.state.internet.selectedTier);
            if (internetTier.discountPeriod) {
                periods.push(internetTier.discountPeriod);
            }
        }

        if (this.state.mobile.enabled) {
            this.state.mobile.simcards.forEach((simcard) => {
                const mobileTier = this.data.products.mobile.tiers.find(t => t.id === simcard.selectedTier);
                if (mobileTier.discountPeriod) {
                    periods.push(mobileTier.discountPeriod);
                }
            });
        }

        if (this.state.tv.enabled) {
            const tvData = this.data.products.tv;
            if (tvData.discountPeriod) {
                periods.push(tvData.discountPeriod);
            }

            const entertainmentBoxTier = tvData.entertainmentBox.tiers.find(t => t.id === this.state.tv.entertainmentBoxTier);
            if (entertainmentBoxTier && entertainmentBoxTier.discountPeriod) {
                periods.push(entertainmentBoxTier.discountPeriod);
            }
        }

        if (this.state.entertainmentBox.enabled && !this.state.tv.enabled) {
            const entertainmentBoxData = this.data.products.entertainmentBox;
            if (entertainmentBoxData && entertainmentBoxData.discountPeriod) {
                periods.push(entertainmentBoxData.discountPeriod);
            }
        }

        // Add WiFi pods discount period
        if (this.state.internet.enabled && this.state.internet.wifiPods > 0) {
            const wifiPodsData = this.data.products.internet.wifiPods;
            if (wifiPodsData.discountPeriod) {
                periods.push(wifiPodsData.discountPeriod);
            }
        }

        if (periods.length > 0) {
            shortestPeriod = Math.min(...periods);
        }

        return shortestPeriod;
    }

    updateCostSummary() {
        const { total, totalDiscount, totalPermanentDiscount, totalTemporaryDiscount } = this.calculateTotal();
        
        // Update main summary total
        const monthlyTotalElement = document.getElementById('monthly-total');
        if (monthlyTotalElement) {
            monthlyTotalElement.textContent = total.toFixed(2).replace('.', ',');
        }

        // Update mobile summary total
        const mobileMonthlyTotalElement = document.getElementById('mobile-monthly-total');
        if (mobileMonthlyTotalElement) {
            mobileMonthlyTotalElement.textContent = total.toFixed(2).replace('.', ',');
        }

        // Update advantage display
        const advantageBlock = document.getElementById('advantage-block');
        const mobileAdvantage = document.getElementById('mobile-advantage');
        
        if (totalTemporaryDiscount > 0) {
            const temporaryData = this.calculateTotalTemporaryDiscount();
            const advantageText = `€${temporaryData.total.toFixed(2).replace('.', ',')} voordeel in totaal`;
            
            if (advantageBlock) {
                advantageBlock.style.display = 'block';
                const advantageAmountElement = document.getElementById('advantage-amount');
                if (advantageAmountElement) {
                    advantageAmountElement.textContent = advantageText;
                }
            }
            
            if (mobileAdvantage) {
                mobileAdvantage.style.display = 'block';
                const mobileAdvantageAmountElement = document.getElementById('mobile-advantage-amount');
                if (mobileAdvantageAmountElement) {
                    mobileAdvantageAmountElement.textContent = advantageText;
                }
            }
        } else {
            if (advantageBlock) advantageBlock.style.display = 'none';
            if (mobileAdvantage) mobileAdvantage.style.display = 'none';
        }

        // Update product overview
        this.updateProductOverview();
    }

    updateProductOverview() {
        const overviewContent = document.getElementById('product-overview-content');
        if (!overviewContent) return;

        let overviewHtml = '';
        
        // Internet
        if (this.state.internet.enabled) {
            const internetTier = this.data.products.internet.tiers.find(t => t.id === this.state.internet.selectedTier);
            let priceHtml = `€${internetTier.price.toFixed(2).replace('.', ',')}`;
            
            if (internetTier.discountValue) {
                const discountedPrice = internetTier.price - internetTier.discountValue;
                priceHtml = `
                    <span class="original-price">€${internetTier.price.toFixed(2).replace('.', ',')}</span>
                    <span class="discount-price">€${discountedPrice.toFixed(2).replace('.', ',')}</span>
                    <span class="discount-info">${internetTier.discountCopy.temporaryOnly}</span>
                `;
            }
            
            overviewHtml += `
                <div class="overview-group">
                    <div class="overview-group-title">Internet</div>
                    <div class="overview-item">
                        <span class="overview-item-name">${internetTier.title}</span>
                        <span class="overview-item-price">${priceHtml}</span>
                    </div>
                </div>
            `;

            // WiFi Pods
            if (this.state.internet.wifiPods > 0) {
                const wifiPodsData = this.data.products.internet.wifiPods;
                const originalPrice = this.state.internet.wifiPods * wifiPodsData.pricePerPod;
                overviewHtml += `
                    <div class="overview-item">
                        <span class="overview-item-name">${this.state.internet.wifiPods}x WiFi-pods</span>
                        <span class="overview-item-price">
                            <span class="original-price">€${originalPrice.toFixed(2).replace('.', ',')}</span>
                            <span class="discount-price">€0,00</span>
                            <span class="discount-info">gedurende ${wifiPodsData.discountPeriod} maanden</span>
                        </span>
                    </div>
                `;
            }
        }

        // Mobile
        if (this.state.mobile.enabled && this.state.mobile.simcards.length > 0) {
            overviewHtml += `
                <div class="overview-group">
                    <div class="overview-group-title">Mobiel</div>
                </div>
            `;
            
            this.state.mobile.simcards.forEach((simcard, index) => {
                const mobileTier = this.data.products.mobile.tiers.find(t => t.id === simcard.selectedTier);
                const discountCalc = this.calculateMobileDiscount(mobileTier, index);
                
                let priceHtml = `€${mobileTier.price.toFixed(2).replace('.', ',')}`;
                
                if (discountCalc.hasDiscount) {
                    if (discountCalc.permanentDiscountAmount > 0 && discountCalc.temporaryDiscountAmount > 0) {
                        const priceAfterPermanent = mobileTier.price - discountCalc.permanentDiscountAmount;
                        priceHtml = `
                            <span class="original-price">€${priceAfterPermanent.toFixed(2).replace('.', ',')}</span>
                            <span class="discount-price">€${discountCalc.finalPrice.toFixed(2).replace('.', ',')}</span>
                            <span class="discount-info">${mobileTier.discountCopy.both}</span>
                        `;
                    } else if (discountCalc.permanentDiscountAmount > 0) {
                        priceHtml = `<span class="discount-price">€${discountCalc.finalPrice.toFixed(2).replace('.', ',')}</span>`;
                    } else if (discountCalc.temporaryDiscountAmount > 0) {
                        priceHtml = `
                            <span class="original-price">€${mobileTier.price.toFixed(2).replace('.', ',')}</span>
                            <span class="discount-price">€${discountCalc.finalPrice.toFixed(2).replace('.', ',')}</span>
                            <span class="discount-info">${mobileTier.discountCopy.temporaryOnly}</span>
                        `;
                    }
                }
                
                overviewHtml += `
                    <div class="overview-item">
                        <span class="overview-item-name">Simkaart ${index + 1} - ${mobileTier.title}</span>
                        <span class="overview-item-price">${priceHtml}</span>
                    </div>
                `;
            });
        }

        // TV
        if (this.state.tv.enabled) {
            const tvData = this.data.products.tv;
            let tvPriceHtml = `€${tvData.price.toFixed(2).replace('.', ',')}`;
            
            if (tvData.discountValue) {
                const discountedPrice = tvData.price - tvData.discountValue;
                tvPriceHtml = `
                    <span class="original-price">€${tvData.price.toFixed(2).replace('.', ',')}</span>
                    <span class="discount-price">€${discountedPrice.toFixed(2).replace('.', ',')}</span>
                    <span class="discount-info">${tvData.discountCopy.temporaryOnly}</span>
                `;
            }
            
            overviewHtml += `
                <div class="overview-group">
                    <div class="overview-group-title">TV</div>
                    <div class="overview-item">
                        <span class="overview-item-name">TV</span>
                        <span class="overview-item-price">${tvPriceHtml}</span>
                    </div>
                </div>
            `;

            // Entertainment Box (via TV)
            const entertainmentBoxTier = tvData.entertainmentBox.tiers.find(t => t.id === this.state.tv.entertainmentBoxTier);
            if (entertainmentBoxTier && entertainmentBoxTier.price !== undefined) {
                let boxPriceHtml = `€${entertainmentBoxTier.price.toFixed(2).replace('.', ',')}`;
                
                if (entertainmentBoxTier.discountValue !== undefined) {
                    const discountedPrice = entertainmentBoxTier.price - entertainmentBoxTier.discountValue;
                    boxPriceHtml = `
                        <span class="original-price">€${entertainmentBoxTier.price.toFixed(2).replace('.', ',')}</span>
                        <span class="discount-price">€${discountedPrice.toFixed(2).replace('.', ',')}</span>
                        <span class="discount-info">${entertainmentBoxTier.discountCopy.temporaryOnly}</span>
                    `;
                }
                
                overviewHtml += `
                    <div class="overview-item">
                        <span class="overview-item-name">${entertainmentBoxTier.title}</span>
                        <span class="overview-item-price">${boxPriceHtml}</span>
                    </div>
                `;
            }
        }

        // Entertainment Box (standalone)
        if (this.state.entertainmentBox.enabled && !this.state.tv.enabled) {
            const entertainmentBoxData = this.data.products.entertainmentBox;
            let boxPriceHtml = `€${entertainmentBoxData.price.toFixed(2).replace('.', ',')}`;
            
            if (entertainmentBoxData.discountValue) {
                const discountedPrice = entertainmentBoxData.price - entertainmentBoxData.discountValue;
                boxPriceHtml = `
                    <span class="original-price">€${entertainmentBoxData.price.toFixed(2).replace('.', ',')}</span>
                    <span class="discount-price">€${discountedPrice.toFixed(2).replace('.', ',')}</span>
                    <span class="discount-info">${entertainmentBoxData.discountCopy.temporaryOnly}</span>
                `;
            }
            
            overviewHtml += `
                <div class="overview-group">
                    <div class="overview-group-title">Entertainment Box</div>
                    <div class="overview-item">
                        <span class="overview-item-name">Entertainment Box</span>
                        <span class="overview-item-price">${boxPriceHtml}</span>
                    </div>
                </div>
            `;
        }

        // Fixed Phone
        if (this.state.fixedPhone.enabled) {
            const phoneData = this.data.products.fixedPhone;
            overviewHtml += `
                <div class="overview-group">
                    <div class="overview-group-title">Vaste lijn</div>
                    <div class="overview-item">
                        <span class="overview-item-name">Vaste lijn</span>
                        <span class="overview-item-price">€${phoneData.price.toFixed(2).replace('.', ',')}</span>
                    </div>
                </div>
            `;
        }

        // Entertainment services
        const selectedServices = Array.from(this.state.selectedEntertainmentServices);
        if (selectedServices.length > 0) {
            overviewHtml += `
                <div class="overview-group">
                    <div class="overview-group-title">Entertainment</div>
                </div>
            `;
            
            selectedServices.forEach(serviceKey => {
                const serviceData = this.entertainmentData.entertainment[serviceKey];
                const serviceName = this.getServiceDisplayName(serviceKey);
                
                let priceHtml;
                if (serviceData.tiers) {
                    const tier = serviceData.tiers.find(t => t.id === this.state[serviceKey].selectedTier);
                    const discountedPrice = this.getEntertainmentDiscountedPrice(tier.price);
                    const hasDiscount = discountedPrice < tier.price;
                    
                    if (hasDiscount) {
                        priceHtml = `<span class="discount-price">€${discountedPrice.toFixed(2).replace('.', ',')}</span>`;
                    } else {
                        priceHtml = `€${tier.price.toFixed(2).replace('.', ',')}`;
                    }
                } else {
                    const discountedPrice = this.getEntertainmentDiscountedPrice(serviceData.price);
                    const hasDiscount = discountedPrice < serviceData.price;
                    
                    if (hasDiscount) {
                        priceHtml = `<span class="discount-price">€${discountedPrice.toFixed(2).replace('.', ',')}</span>`;
                    } else {
                        priceHtml = `€${serviceData.price.toFixed(2).replace('.', ',')}`;
                    }
                }
                
                overviewHtml += `
                    <div class="overview-item">
                        <span class="overview-item-name">${serviceName}</span>
                        <span class="overview-item-price">${priceHtml}</span>
                    </div>
                `;
            });
        }

        overviewContent.innerHTML = overviewHtml;
    }

    toggleProductOverview() {
        const overviewContent = document.getElementById('product-overview-content');
        const toggleArrow = document.getElementById('toggle-arrow');
        
        if (!overviewContent || !toggleArrow) return;
        
        if (overviewContent.style.display === 'none' || overviewContent.style.display === '') {
            overviewContent.style.display = 'block';
            toggleArrow.classList.add('rotated');
        } else {
            overviewContent.style.display = 'none';
            toggleArrow.classList.remove('rotated');
        }
    }

    scrollToMainSummary() {
        const costSummary = document.querySelector('.cost-summary');
        if (costSummary) {
            costSummary.scrollIntoView({
                behavior: 'smooth',
                block: 'start'
            });
        }
    }

    openTooltipSheet(tooltipKey) {
        const tooltipData = this.data.tooltips[tooltipKey];
        if (!tooltipData) return;

        const overlay = document.getElementById('sheet-overlay');
        const title = document.getElementById('sheet-title');
        const body = document.getElementById('sheet-body');

        if (!overlay || !title || !body) return;

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
        if (overlay) {
            overlay.style.display = 'none';
            document.body.style.overflow = '';
        }
    }

    // Entertainment specific methods
    openEntertainmentBottomSheet() {
        const overlay = document.getElementById('entertainment-sheet-overlay');
        if (overlay) {
            overlay.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        }
    }

    closeEntertainmentBottomSheet() {
        const overlay = document.getElementById('entertainment-sheet-overlay');
        if (overlay) {
            overlay.style.display = 'none';
            document.body.style.overflow = '';
        }
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
        if (comboDiscountBanner) {
            if (selectedServices.length >= 2) {
                comboDiscountBanner.style.display = 'flex';
            } else {
                comboDiscountBanner.style.display = 'none';
            }
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
                    const isSelected = tier.id === this.state[serviceKey].selectedTier;
                    let subtitleContent = '';

                    if (!isSelected) {
                        const discountedPrice = this.getEntertainmentDiscountedPrice(tier.price);
                        const hasDiscount = discountedPrice < tier.price;
                        const priceText = `€${discountedPrice.toFixed(2).replace('.', ',')}`;

                        if (hasDiscount) {
                            subtitleContent = `<div class="tier-subtitle promotional-price">${priceText}</div>`;
                        } else {
                            subtitleContent = `<div class="tier-subtitle">${priceText}</div>`;
                        }
                    }

                    return `
                        <div class="service-tier-option ${isSelected ? 'active' : ''}" 
                             onclick="app.selectEntertainmentServiceTier('${serviceKey}', ${tier.id})">
                            <div class="tier-title">${tier.title}</div>
                            ${subtitleContent}
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
            // Permanent discount: show only pink price without strikethrough
            return `
                <div class="service-price-container">
                    <div class="service-price permanent-discount">€ ${discountedPrice.toFixed(2).replace('.', ',')}/maand</div>
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
        // Remove existing highlight blocks
        const existingHighlights = document.querySelectorAll('.highlight-block');
        existingHighlights.forEach(block => block.remove());

        // Highlight blocks are no longer added automatically
        this.updateMobileHighlightBlock(); // Ensure Mobile highlight is updated/removed
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

    // Add method to remove product closed state
    removeProductClosedState(productType) {
        const blockId = productType === 'fixedPhone' ? 'fixed-phone-block' : `${productType}-block`;
        const productBlock = document.getElementById(blockId);
        if (!productBlock) return;

        // Remove any existing closed state content
        const existingClosedContent = productBlock.querySelector('.product-closed-content');
        if (existingClosedContent) {
            existingClosedContent.remove();
        }

        // Also remove old closed state divs if they exist
        const existingClosedState = productBlock.querySelector('.product-closed-state');
        if (existingClosedState) {
            existingClosedState.remove();
        }

        // Remove any highlight blocks that might be inserted
        const existingHighlight = productBlock.querySelector('.highlight-block');
        if (existingHighlight) {
            existingHighlight.remove();
        }
    }

    // Add method to render closed states for all disabled products
    renderClosedStatesForDisabledProducts() {
        const allProducts = ['internet', 'mobile', 'tv', 'fixedPhone', 'entertainment', 'entertainmentBox'];

        allProducts.forEach(productType => {
            if (!this.state[productType].enabled) {
                this.renderProductClosedState(productType);
            }
        });
    }

    // Add method to render product closed state
    renderProductClosedState(productType) {
        const blockId = productType === 'fixedPhone' ? 'fixed-phone-block' : `${productType}-block`;
        const productBlock = document.getElementById(blockId);
        if (!productBlock) return;

        // Remove existing closed state first
        this.removeProductClosedState(productType);

        // Get closed state data
        let closedStateData;
        if (productType === 'entertainment' && this.entertainmentData) {
            closedStateData = this.entertainmentData.closedStates?.[productType];
        } else if (productType === 'entertainmentBox' && this.data) {
            closedStateData = this.data.closedStates?.[productType];
        } else {
            closedStateData = this.data?.closedStates?.[productType];
        }

        if (!closedStateData) return;

        // Calculate price for summary
        let price = this.calculateClosedStatePrice(productType, null);
        let summary = closedStateData.summary.replace('##PRICE##', price.toFixed(2).replace('.', ','));

        // Create closed state content
        let closedStateHtml = `
            <div class="product-closed-content">
                <div class="product-closed-divider"></div>
        `;

        // Add special content for entertainment (service icons)
        if (productType === 'entertainment' && closedStateData.showServiceIcons) {
            closedStateHtml += `
                <div class="entertainment-service-icons">
                    <div class="entertainment-service-icon netflix">N</div>
                    <div class="entertainment-service-icon disney">D+</div>
                    <div class="entertainment-service-icon streamz">S</div>
                    <div class="entertainment-service-icon hbo">HBO</div>
                    <div class="entertainment-service-icon sport">⚽</div>
                    <div class="entertainment-service-icon cinema">🎬</div>
                </div>
            `;
        }

        // Add special container for entertainment box
        if (productType === 'entertainmentBox' && closedStateData.showImage) {
            closedStateHtml += `
                <div class="entertainment-box-container">
                    <div class="entertainment-box-image"></div>
                    <div class="entertainment-box-content">
            `;
        }

        // Add summary
        closedStateHtml += `<div class="product-closed-summary">${summary}</div>`;

        // Add highlight if present
        if (closedStateData.highlight) {
            closedStateHtml += `
                <div class="product-closed-highlight">
                    <div class="product-closed-highlight-title">${closedStateData.highlight.title}</div>
                    <div class="product-closed-highlight-content">${closedStateData.highlight.content}</div>
                </div>
            `;
        }

        // Close entertainment box container if needed
        if (productType === 'entertainmentBox' && closedStateData.showImage) {
            closedStateHtml += `
                    </div>
                </div>
            `;
        }

        closedStateHtml += `</div>`;

        // Insert the closed state content
        productBlock.insertAdjacentHTML('beforeend', closedStateHtml);
    }

    // Helper method to calculate price for closed state
    calculateClosedStatePrice(productType, tier) {
        if (productType === 'internet') {
            const lowestTier = this.data.products.internet.tiers[0];
            return lowestTier.discountValue ? lowestTier.price - lowestTier.discountValue : lowestTier.price;
        } else if (productType === 'mobile') {
            const lowestTier = this.data.products.mobile.tiers[0];
            return lowestTier.discountValue ? lowestTier.price - lowestTier.discountValue : lowestTier.price;
        } else if (productType === 'tv') {
            const tvData = this.data.products.tv;
            return tvData.discountValue ? tvData.price - tvData.discountValue : tvData.price;
        } else if (productType === 'fixedPhone') {
            return this.data.products.fixedPhone.price;
        } else if (productType === 'entertainmentBox') {
            const standaloneData = this.data.products.entertainmentBox;
            if (standaloneData) {
                return standaloneData.discountValue ? standaloneData.price - standaloneData.discountValue : standaloneData.price;
            }
            return 5.00; // fallback
        }
        return 0;
    }

    updateMobileHighlightBlock() {
        const mobileBlock = document.getElementById('mobile-block');
        if (!mobileBlock) return;

        const existingHighlight = mobileBlock.querySelector('.highlight-block');
        if (existingHighlight) {
            existingHighlight.remove(); // Remove existing highlight
        }

        if (this.state.mobile.enabled) {
            let highlightHtml = '';
            let highlightClass = '';
            let highlightTitle = '';
            let highlightContent = '';

            if (!this.state.internet.enabled) {
                highlightClass = 'highlight-block light-grey';
                highlightTitle = 'Extra voordeel met Internet + Mobiel';
                highlightContent = 'Minstens 50% korting op je mobiele abonnement in combinatie met internet.';
            } else {
                highlightClass = 'highlight-block blue';
                highlightTitle = 'Korting Actief';
                highlightContent = 'Je korting is actief doordat je internet en mobiel combineert.';
            }

            if (highlightClass !== '') {
                highlightHtml = `
                    <div class="${highlightClass}" onclick="app.openAdvantageBottomSheet()">
                        <div class="highlight-title">${highlightTitle}</div>
                        <div class="highlight-content">${highlightContent}</div>
                    </div>
                `;

                const simcardsContainer = document.getElementById('simcards-container');
                if (simcardsContainer) {
                    simcardsContainer.insertAdjacentHTML('beforebegin', highlightHtml);
                }
            }
        }
    }
    
    // Advantage bottomsheet methods
    openAdvantageBottomSheet() {
        const overlay = document.getElementById('advantage-sheet-overlay');
        const title = document.getElementById('advantage-sheet-title');
        const body = document.getElementById('advantage-sheet-body');
        
        if (!overlay || !title || !body) return;

        // Get temporary discount data
        const temporaryData = this.calculateTotalTemporaryDiscount();
        
        // Sort discounts by duration (shortest first)
        const sortedDiscounts = temporaryData.discounts.sort((a, b) => a.discountPeriod - b.discountPeriod);
        
        // Create discount overview
        const discountList = sortedDiscounts.map(discount => 
            `<li>${discount.discountPeriod} maanden €${discount.discountValue.toFixed(2).replace('.', ',')} korting op ${discount.product}</li>`
        ).join('');

        // Calculate price evolution based on temporary discount expiration
        const { total: currentPrice } = this.calculateTotal();
        
        // Get unique discount periods
        const uniquePeriods = [...new Set(temporaryData.discounts.map(d => d.discountPeriod))].sort((a, b) => a - b);
        
        // Calculate price progression
        const priceProgression = [];
        priceProgression.push({
            period: 0,
            price: currentPrice,
            description: `€${currentPrice.toFixed(2).replace('.', ',')}/maand gedurende de eerste ${uniquePeriods[0] || 3} maanden`
        });

        let cumulativePrice = currentPrice;
        uniquePeriods.forEach(period => {
            // Find all discounts that expire at this period
            const expiringDiscounts = temporaryData.discounts.filter(d => d.discountPeriod === period);
            const totalExpiringDiscount = expiringDiscounts.reduce((sum, d) => sum + d.discountValue, 0);
            
            cumulativePrice += totalExpiringDiscount;
            priceProgression.push({
                period: period,
                price: cumulativePrice,
                description: `€${cumulativePrice.toFixed(2).replace('.', ',')}/maand na ${period} maanden`
            });
        });

        const priceProgressionList = priceProgression.map(p => `<li>${p.description}</li>`).join('');

        // Create bundelvoordelen list - include both mobile and entertainment permanent discounts
        const bundleAdvantages = [];
        
        // Mobile permanent discounts
        if (this.state.mobile.enabled && this.state.internet.enabled) {
            this.state.mobile.simcards.forEach((simcard, index) => {
                const mobileTier = this.data.products.mobile.tiers.find(t => t.id === simcard.selectedTier);
                const permanentDiscount = this.data.discounts.permanent;
                if (permanentDiscount.enabled && permanentDiscount.conditions.applicableToTiers.includes(mobileTier.id)) {
                    bundleAdvantages.push(`50% korting gedurende op je ${index === 0 ? '1e' : index === 1 ? '2e' : `${index + 1}e`} mobiele abonnement (${mobileTier.title})`);
                }
            });
        }

        // Entertainment permanent discounts
        const enabledEntertainmentServices = this.getEnabledEntertainmentProductsCount();
        if (enabledEntertainmentServices >= 2) {
            bundleAdvantages.push(`5% korting op je entertainment services door bundeling`);
        }

        const bundleAdvantagesList = bundleAdvantages.map(advantage => 
            `<li>${advantage}</li>`
        ).join('');

        // Calculate total permanent discount per year
        const permanentData = this.calculateTotalPermanentDiscount();

        title.textContent = 'Jouw voordeel';
        body.innerHTML = `
            <div class="advantage-section">
                <h4>Overzicht van je kortingen</h4>
                <ul>
                    ${discountList}
                </ul>
            </div>

            <div class="advantage-section">
                <h4>Je betaalt</h4>
                <ul>
                    ${priceProgressionList}
                </ul>
                
                <div class="advantage-total">
                    Totaal voordeel: €${temporaryData.total.toFixed(2).replace('.', ',')}
                </div>
            </div>

            ${bundleAdvantages.length > 0 ? `
            <div class="advantage-section">
                <p>Daarnaast geniet je nog van een aantal <strong>bundelvoordelen</strong>:</p>
                <ul>
                    ${bundleAdvantagesList}
                </ul>
                
                <div class="advantage-extra">
                    Extra voordeel per jaar: €${permanentData.total.toFixed(2).replace('.', ',')}
                </div>
            </div>
            ` : ''}

            <p><em>Promo alleen geldig voor nieuwe klanten</em></p>
        `;

        overlay.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }

    closeAdvantageBottomSheet() {
        const overlay = document.getElementById('advantage-sheet-overlay');
        if (overlay) {
            overlay.style.display = 'none';
            document.body.style.overflow = '';
        }
    }
}

// Initialize the app
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new UnifiedConfigurator();
});
