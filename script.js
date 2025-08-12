class UnifiedConfigurator {
    constructor() {
        this.data = null;
        this.entertainmentData = null;
        this.currentSection = 'telecom'; // 'telecom' or 'entertainment'
        this.currentStreamingService = null;
        this.isEditingStreamingService = false;
        this.tempSelectedTier = null;
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
            selectedEntertainmentServices: new Set(),
            // Welcome Gift state
            welcomeGiftService: null, // Stores which service has the welcome gift
            // WiFi-pods standalone state
            wifiPods: {
                enabled: false,
                count: 1
            }
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
            const [dataResponse, entertainmentResponse, discountsResponse] = await Promise.all([
                fetch('./data.json'),
                fetch('./entertainment-data.json'),
                fetch('./discounts.json')
            ]);
            this.data = await dataResponse.json();
            this.entertainmentData = await entertainmentResponse.json();
            this.discountsData = await discountsResponse.json();
        } catch (error) {
            console.error('Error loading data:', error);
        }
    }

    updatePageTitle(packParam) {
        const pageTitle = document.querySelector('.page-header h1');
        if (!pageTitle) return;

        if (packParam && packParam.trim() !== '') {
            const capitalizedPack = packParam.charAt(0).toUpperCase() + packParam.slice(1).toLowerCase();
            pageTitle.textContent = `Pas je combinatie aan`;
        } else {
            pageTitle.textContent = 'Pas je product aan';
        }
    }

    updatePackBanner(packParam) {
        const packBanner = document.getElementById('pack-banner');
        if (!packBanner) return;

        if (packParam && packParam.trim() !== '') {
            const packValue = packParam.toLowerCase();
            packBanner.style.display = 'block';
            packBanner.style.backgroundImage = `url('final_assets/${packValue}.jpg')`;
        } else {
            packBanner.style.display = 'none';
        }
    }

    parseUrlParameters() {
        const urlParams = new URLSearchParams(window.location.search);

        // Pack parameter: ?pack=gamer|family|starter
        const packParam = urlParams.get('pack');
        this.updatePageTitle(packParam);
        this.updatePackBanner(packParam);

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

        // WiFi Pods: ?wifipods=3 (number of WiFi pods)
        const wifiPodsParam = urlParams.get('wifipods');
        if (wifiPodsParam) {
            const wifiPodsCount = Math.min(parseInt(wifiPodsParam), 5);
            if (wifiPodsCount > 0) {
                this.state.wifiPods.enabled = true;
                this.state.wifiPods.count = wifiPodsCount;
                const wifiPodsToggle = document.getElementById('wifi-pods-toggle');
                const wifiPodsContent = document.getElementById('wifi-pods-content');
                if (wifiPodsToggle && wifiPodsContent) {
                    wifiPodsToggle.checked = true;
                    wifiPodsContent.style.display = 'block';
                    this.updateWifiPodsStandaloneInfo();
                    this.removeProductClosedState('wifiPods');
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
                //this.renderEntertainmentBoxTiers();

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
                    this.removeProductClosedState('entertainmentBox');
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

        // Entertainment: ?entertainment=1 (1 enables entertainment)
        const entertainmentEnabled = urlParams.get('entertainment');
        if (entertainmentEnabled === '1') {
            this.state.entertainment.enabled = true;
            const entertainmentToggle = document.getElementById('entertainment-toggle');
            const entertainmentContent = document.getElementById('entertainment-content');
            if (entertainmentToggle && entertainmentContent) {
                entertainmentToggle.checked = true;
                entertainmentContent.style.display = 'block';
                this.renderAvailableEntertainmentServices();
                this.renderSelectedEntertainmentServices();
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
                // Check if we need to show confirmation dialog when unchecking
                if (!e.target.checked && this.shouldShowDeselectionConfirmation()) {
                    // Prevent the checkbox from unchecking and show confirmation dialog
                    e.target.checked = true;
                    this.openEntertainmentBoxDeselectionDialog();
                    return;
                }

                const entertainmentBoxToggle = document.getElementById('entertainment-box-toggle');
                const warningHighlight = document.getElementById('warning-highlight');
                if (entertainmentBoxToggle) {
                    entertainmentBoxToggle.checked = e.target.checked;
                    this.toggleProduct('entertainmentBox', e.target.checked);
                }
                if (warningHighlight) {
                    warningHighlight.style.display = e.target.checked ? 'none' : 'block';
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

        // Entertainment Hub selection radio buttons
        const separateAppsRadio = document.getElementById('separate-apps-radio');
        const entertainmentHubRadio = document.getElementById('entertainment-hub-radio');

        if (separateAppsRadio) {
            separateAppsRadio.addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.handleStreamingMethodSelection('separate');
                }
            });
        }

        if (entertainmentHubRadio) {
            entertainmentHubRadio.addEventListener('change', (e) => {
                if (e.target.checked) {
                    this.handleStreamingMethodSelection('hub');
                }
            });
        }

        // Entertainment Box toggle (only if element exists)
        const entertainmentBoxToggle = document.getElementById('entertainment-box-toggle');
        if (entertainmentBoxToggle) {
            entertainmentBoxToggle.addEventListener('change', (e) => {
                // Check if we need to show confirmation dialog when deselecting
                if (!e.target.checked && this.shouldShowDeselectionConfirmation()) {
                    // Prevent the toggle from changing and show confirmation dialog
                    e.target.checked = true;
                    this.openEntertainmentBoxDeselectionDialog();
                    return;
                }

                this.toggleProduct('entertainmentBox', e.target.checked);

                // Sync the TV checkbox when Entertainment Box is toggled
                const tvCheckbox = document.getElementById('tv-entertainment-box-checkbox');
                const warningHighlight = document.getElementById('warning-highlight');

                if (tvCheckbox && this.state.tv.enabled) {
                    tvCheckbox.checked = e.target.checked;
                    warningHighlight.style.display = tvCheckbox.checked ? 'none' : 'block';
                }
            });
        }

        // WiFi-pods toggle (only if element exists)
        const wifiPodsToggle = document.getElementById('wifi-pods-toggle');
        if (wifiPodsToggle) {
            wifiPodsToggle.addEventListener('change', (e) => {
                this.toggleProduct('wifiPods', e.target.checked);
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
        const mobileSummary = document.getElementById('mobile-bottom-summary');
        const mainSummary = document.querySelector('.cost-summary');

        if (!mobileSummary || !mainSummary) return;

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

    setupProductHeaderListeners() {
        const allProducts = [
            { id: 'internet', headerSelector: '#internet-block .product-header', toggleSelector: '#internet-toggle' },
            { id: 'mobile', headerSelector: '#mobile-block .product-header', toggleSelector: '#mobile-toggle' },
            { id: 'tv', headerSelector: '#tv-block .product-header', toggleSelector: '#tv-toggle' },
            { id: 'fixedPhone', headerSelector: '#fixed-phone-block .product-header', toggleSelector: '#fixed-phone-toggle' },
            { id: 'entertainment', headerSelector: '#entertainment-block .product-header', toggleSelector: '#entertainment-toggle' },
            { id: 'entertainmentBox', headerSelector: '#entertainment-box-block .product-header', toggleSelector: '#entertainment-box-toggle' },
            { id: 'wifiPods', headerSelector: '#wifi-pods-block .product-header', toggleSelector: '#wifi-pods-toggle' }
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
        const allProducts = ['internet', 'mobile', 'tv', 'fixedPhone', 'entertainment', 'entertainmentBox', 'wifiPods'];

        allProducts.forEach(productId => {
            let blockId;
            if (productId === 'fixedPhone') {
                blockId = 'fixed-phone-block';
            } else if (productId === 'entertainmentBox') {
                blockId = 'entertainment-box-block';
            } else if (productId === 'wifiPods') {
                blockId = 'wifi-pods-block';
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
        // Check if we should show entertainment box recommendation
        if (this.shouldShowEntertainmentBoxRecommendation()) {
            this.openEntertainmentBoxRecommendation();
        } else {
            // Directly go to success page
            console.log('Order placed!', this.state);
            window.location.href = 'success.html';
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
                    console.log("internet default tier = ", this.data.products.internet.defaultTier);

                    this.state.internet.selectedTier = this.data.products.internet.defaultTier;
                    this.renderInternetTiers();
                    this.updateInternetInfo();
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
                    //this.state.tv.entertainmentBoxTier = this.data.products.tv.entertainmentBox.defaultTier;
                    this.updateTvInfo();
                    //this.renderEntertainmentBoxTiers();

                    // Auto-check the TV checkbox since Entertainment Box is enabled by default
                    const tvCheckbox = document.getElementById('tv-entertainment-box-checkbox');
                    const warningHighlight = document.getElementById('warning-highlight');
                    if (tvCheckbox) {
                        tvCheckbox.checked = true;
                        warningHighlight.style.display = 'none';
                    }

                    if (!this.state.entertainmentBox.enabled) {
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
                            this.removeProductClosedState('entertainmentBox');
                        }
                    }

                    // Update Entertainment Hub selection visibility
                    this.updateEntertainmentHubSelectionVisibility();
                    // Update TV bundle highlight visibility
                    this.updateTvBundleHighlight();
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
                } else if (productType === 'tv') {
                    // Update Entertainment Hub selection visibility
                    this.updateEntertainmentHubSelectionVisibility();
                    // Update TV bundle highlight visibility
                    this.updateTvBundleHighlight();
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
                this.updateEntertainmentHubSelectionVisibility();
                this.updateTvBundleHighlight();

                // Smooth scroll to ensure the product block is visible at the top of viewport
                setTimeout(() => {
                    const productBlock = document.getElementById('entertainment-block');
                    if (productBlock) {
                        productBlock.scrollIntoView({
                            behavior: 'smooth',
                            block: 'start'
                        });
                    }
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
                this.updateEntertainmentHubSelectionVisibility();
                this.updateTvBundleHighlight();
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
        // Handle WiFi-pods toggle
        else if (productType === 'wifiPods') {
            const content = document.getElementById('wifi-pods-content');
            const freeTrialDiv = document.getElementById('wifi-pods-free-trial');

            if (enabled) {
                this.removeProductClosedState('wifiPods');
                if (content) content.style.display = 'block';
                if (freeTrialDiv) freeTrialDiv.style.display = 'none';
                this.state.wifiPods.count = 1;
                this.updateWifiPodsStandaloneInfo();

                // Smooth scroll to ensure the product block is visible
                setTimeout(() => {
                    const productBlock = document.getElementById('wifi-pods-block');
                    this.scrollToElementSmooth(productBlock);
                }, 100);
            } else {
                if (content) content.style.display = 'none';
                if (freeTrialDiv) freeTrialDiv.style.display = 'block';
                this.renderProductClosedState('wifiPods');
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

            console.log("selected internet tier = ", this.state.internet.selectedTier);

            const isSelected = tier.id === this.state.internet.selectedTier;
            let finalPrice = tier.price;
            let hasTemporaryDiscount = false;

            if (tier.discountValue) {
                finalPrice = tier.price - tier.discountValue;
                hasTemporaryDiscount = true;
            }

            let subtitleContent = '';
            if (hasTemporaryDiscount) {
                subtitleContent = `<div class="tier-subtitle promotional-price">€${finalPrice.toFixed(2).replace('.', ',')}</div>`;
            } else {
                subtitleContent = `<div class="tier-subtitle">€${finalPrice.toFixed(2).replace('.', ',')}</div>`;
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
        `;
    }

    // WiFi-pods section methods removed - now using standalone WiFi-pods card

    // WiFi-pods standalone methods
    increaseWifiPodsStandalone() {
        const maxPods = this.data.products.wifiPods.maxPods;
        if (this.state.wifiPods.count < maxPods) {
            this.state.wifiPods.count++;
            this.updateWifiPodsStandaloneInfo();
            this.updateWifiPodsStandaloneCounter();
            this.updateCostSummary();
        }
    }

    decreaseWifiPodsStandalone() {
        if (this.state.wifiPods.count > 1) {
            this.state.wifiPods.count--;
            this.updateWifiPodsStandaloneInfo();
            this.updateWifiPodsStandaloneCounter();
            this.updateCostSummary();
        }
    }

    updateWifiPodsStandaloneCounter() {
        const counterElement = document.getElementById('wifi-pods-count');
        const decreaseBtn = document.getElementById('wifi-pods-decrease');
        const increaseBtn = document.getElementById('wifi-pods-increase');

        if (counterElement) {
            counterElement.textContent = this.state.wifiPods.count;
        }

        if (decreaseBtn) {
            decreaseBtn.disabled = this.state.wifiPods.count <= 1;
        }

        if (increaseBtn) {
            increaseBtn.disabled = this.state.wifiPods.count >= this.data.products.wifiPods.maxPods;
        }
    }

    updateWifiPodsStandaloneInfo() {
        const infoContainer = document.getElementById('wifi-pods-info');
        if (!infoContainer || !this.data) return;

        const wifiPodsData = this.data.products.wifiPods;
        const currentPods = this.state.wifiPods.count;
        const originalPrice = currentPods * wifiPodsData.pricePerPod;
        const discountedPrice = 0; // Free for 3 months
        const promoBadge = `<span class="promo-badge">${wifiPodsData.promoName}</span>`;

        const summaryItems = wifiPodsData.summary.split(', ').map(item => `<li>${item}</li>`).join('');

        const priceHtml = `
            <div class="tier-price-container">
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

        infoContainer.innerHTML = `
            <ul class="tier-details">
                ${summaryItems}
            </ul>
            ${priceHtml}
        `;

        this.updateWifiPodsStandaloneCounter();
    }

    // Mobile methods
    renderMobileSimcards() {
        const container = document.getElementById('simcards-container');
        const addBtn = document.getElementById('add-simcard-btn');

        if (!container || !addBtn || !this.data) return;

        container.innerHTML = this.state.mobile.simcards.map((simcard, index) => {
            const tierOptions = this.data.products.mobile.tiers.map(tier => {
                const discountCalc = this.calculateMobileDiscount(tier, index);
                const displayPrice = discountCalc.hasDiscount ? discountCalc.finalPrice : tier.price;
                const isSelected = tier.id === simcard.selectedTier;

                let subtitleContent = '';
                if (discountCalc.temporaryDiscountAmount > 0) {
                    subtitleContent = `<div class="tier-subtitle promotional-price">€${displayPrice.toFixed(2).replace('.', ',')}</div>`;
                } else {
                    subtitleContent = `<div class="tier-subtitle">€${displayPrice.toFixed(2).replace('.', ',')}</div>`;
                }

                return `
                    <div class="tier-option ${isSelected ? 'active' : ''}" 
                         onclick="app.selectMobileTier(${simcard.id}, ${tier.id})">
                        <div class="tier-title">${tier.title}</div>
                        ${subtitleContent}
                    </div>
                `;
            }).join('');

            const deleteButton = this.state.mobile.simcards.length > 1 && index > 0 ?
                `<button class="delete-simcard" onclick="app.deleteSimcard(${simcard.id})">🗑️</button>` : '';

            return `
                <div class="simcard">
                    <div class="simcard-header">
                        <div class="simcard-title">Simkaart ${index + 1}</div>
                        ${deleteButton}
                    </div>
                    <div class="tier-selector">
                        ${tierOptions}
                    </div>
                    <div class="tier-info">
                        ${this.getMobileTierInfo(simcard.selectedTier, index)}
                    </div>
                </div>
            `;
        }).join('');

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
                        <div class="combo-discount-tag" onclick="app.openComboDiscountSheet('permanentDiscount')">
                            <span>Combokorting geactiveerd</span>
                    <img src="final_assets/icons/i-icon-blue.svg" alt="info" class="info-icon">
                        </div>
                    </div>
                `;
            } else if (permanentDiscountAmount > 0) {
                // Only permanent discount: show normal price with combo discount tag
                priceHtml = `
                    <div class="tier-price-container">
                        <div class="tier-price">€ ${finalPrice.toFixed(2).replace('.', ',')}/maand</div>
                        <div class="combo-discount-tag" onclick="app.openComboDiscountSheet('permanentDiscount')">
                            <span>Combokorting geactiveerd</span>
                    <img src="final_assets/icons/i-icon-blue.svg" alt="info" class="info-icon">
                        </div>
                    </div>
                `;
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
        const entertainmentData = this.data.products.entertainmentBox;

        const summaryItems = tvData.summary.split(', ').map(item => `<li>${item}</li>`).join('');

        // No temporary discount for TV anymore
        const priceHtml = `<div class="tier-price">€ ${(tvData.price + entertainmentData.price).toFixed(2).replace('.', ',')}/maand</div>`;

        infoContainer.innerHTML = `
            <ul class="tier-details">
                ${summaryItems}
            </ul>
            ${priceHtml}
        `;
    }

    /*
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
    */

    updateEntertainmentBoxInfo() {
        console.log("ent box update from TV ");

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

        // Always show the base price without discount for Entertainment Box
        const priceHtml = `<div class="tier-price">€ ${entertainmentBoxData.price.toFixed(2).replace('.', ',')}/maand</div>`;

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
            const discountedPrice = this.getEntertainmentDiscountedPrice(tier.price);
            const hasDiscount = discountedPrice < tier.price;
            const priceText = `€${discountedPrice.toFixed(2).replace('.', ',')}`;

            let subtitleContent = '';
            // For entertainment services, permanent discounts should use default color
            // Only temporary discounts (if any) should use promotional color
            subtitleContent = `<div class="tier-subtitle">${priceText}</div>`;

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
            // Permanent discount: show normal price with combo discount tag
            priceHtml = `
                <div class="tier-price-container">
                    <div class="tier-price">€ ${discountPrice.toFixed(2).replace('.', ',')}/maand</div>
                    <div class="combo-discount-tag" onclick="app.openComboDiscountSheet('entertainmentCombo')">
                        Combokorting geactiveerd
                        <img src="final_assets/icons/i-icon-blue.svg" alt="info" class="info-icon">
                    </div>
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
            // Permanent discount: show normal price with combo discount tag
            priceHtml = `
                <div class="tier-price-container">
                    <div class="tier-price">€ ${discountPrice.toFixed(2).replace('.', ',')}/maand</div>
                    <div class="combo-discount-tag" onclick="app.openComboDiscountSheet('entertainmentCombo')">
                        <span>Combokorting geactiveerd</span>
                    <img src="final_assets/icons/i-icon-blue.svg" alt="info" class="info-icon">
                    </div>
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

    getEntertainmentDiscountedPrice(originalPrice, isAddingSecondService = false, serviceKey = null, tier = null) {
        // Check if this service has Welcome Gift
        if (serviceKey && this.state.welcomeGiftService === serviceKey) {
            const serviceData = this.entertainmentData.entertainment[serviceKey];
            if (serviceData) {
                if (serviceData.tiers && tier) {
                    const tierData = serviceData.tiers.find(t => t.id === tier);
                    if (tierData && tierData.welcomeGift) {
                        return tierData.welcomeGift.price;
                    }
                } else if (serviceData.welcomeGift) {
                    return serviceData.welcomeGift.price;
                }
            }
        }

        // Don't apply 5% discount if Welcome Gift is still available (no service has been assigned the gift yet)
        if (this.state.welcomeGiftService === null) {
            return originalPrice;
        }

        const enabledProducts = this.getEnabledEntertainmentProductsCount();
        const discount = this.entertainmentData.discounts.entertainment_combo;

        // Apply discount if we already have enough products OR if we're adding the second service
        const willHaveMinProducts = enabledProducts >= discount.minProducts ||
            (enabledProducts === 1 && isAddingSecondService);

        if (discount.enabled && willHaveMinProducts) {
            return originalPrice * (1 - discount.percentage / 100);
        }
        return originalPrice;
    }

    getEnabledEntertainmentProductsCount() {
        return ['netflix', 'streamz', 'disney', 'sport', 'cinema', 'hbo']
            .filter(productId => this.state[productId].enabled).length;
    }

    getWelcomeGiftDiscountInfo(serviceKey) {
        const serviceData = this.entertainmentData.entertainment[serviceKey];
        if (!serviceData) return '';

        let welcomeGiftData;
        if (serviceData.tiers) {
            const tier = serviceData.tiers.find(t => t.id === this.state[serviceKey].selectedTier);
            welcomeGiftData = tier ? tier.welcomeGift : null;
        } else {
            welcomeGiftData = serviceData.welcomeGift;
        }

        if (!welcomeGiftData) return '';

        const originalPrice = serviceData.tiers ? 
            serviceData.tiers.find(t => t.id === this.state[serviceKey].selectedTier).price :
            serviceData.price;

        return `
            <div class="welcome-gift-discount-info">
                <div class="original-price">€ ${originalPrice.toFixed(2).replace('.', ',')}</div>
                <div class="discount-info">gedurende ${welcomeGiftData.duration} maanden</div>
            </div>
        `;
    }

    assignWelcomeGift(serviceKey) {
        // Only assign if no welcome gift has been assigned yet
        if (this.state.welcomeGiftService === null) {
            this.state.welcomeGiftService = serviceKey;
        }
    }

    removeWelcomeGift(serviceKey) {
        if (this.state.welcomeGiftService === serviceKey) {
            this.state.welcomeGiftService = null;
            // Assign welcome gift to next service if any exists
            const selectedServices = Array.from(this.state.selectedEntertainmentServices);
            const remainingServices = selectedServices.filter(s => s !== serviceKey);
            if (remainingServices.length > 0) {
                this.state.welcomeGiftService = remainingServices[0];
            }
        }
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
            /*
            const entertainmentBoxTier = tvData.entertainmentBox.tiers.find(t => t.id === this.state.tv.entertainmentBoxTier);
            if (entertainmentBoxTier && entertainmentBoxTier.price !== undefined) {
                if (entertainmentBoxTier.discountValue !== undefined) {
                    total += entertainmentBoxTier.price - entertainmentBoxTier.discountValue;
                    totalTemporaryDiscount += entertainmentBoxTier.discountValue;
                } else {
                    total += entertainmentBoxTier.price;
                }
            }
            */
        }

        // Fixed Phone cost
        if (this.state.fixedPhone.enabled) {
            const phoneData = this.data.products.fixedPhone;
            total += phoneData.price;
        }

        // Entertainment Box cost (only when standalone - not part of TV)
        if (this.state.entertainmentBox.enabled) {
            const entertainmentBoxData = this.data.products.entertainmentBox;

            console.log("entertainmentBoxData = ", entertainmentBoxData);

            // Always use base price without discount for Entertainment Box
            total += entertainmentBoxData.price;
        }

        // WiFi-pods standalone cost
        if (this.state.wifiPods.enabled) {
            const wifiPodsData = this.data.products.wifiPods;
            if (this.state.wifiPods.count > 0) {
                const podsOriginalPrice = this.state.wifiPods.count * wifiPodsData.pricePerPod;
                const podsDiscountedPrice = 0; // Free for promotional period
                total += podsDiscountedPrice;
                totalTemporaryDiscount += podsOriginalPrice; // Full discount for promotional period
            }
        }
        /*
        if (this.state.entertainmentBox && this.state.entertainmentBox.enabled && (!this.state.tv || !this.state.tv.enabled)) {
            const entertainmentBoxData = this.data.products.entertainmentBox;
            if (entertainmentBoxData) {
                if (entertainmentBoxData.discountValue) {
                    total += entertainmentBoxData.price - entertainmentBoxData.discountValue;
                    totalTemporaryDiscount += entertainmentBoxData.discountValue;
                } else {
                    total += entertainmentBoxData.price;
                }
            }
        }
        */

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
            const discountedPrice = this.getEntertainmentDiscountedPrice(tier.price, false, 'netflix', this.state.netflix.selectedTier);
            total += discountedPrice;
            if (hasComboDiscount && this.state.welcomeGiftService !== 'netflix') {
                totalDiscount += tier.price - discountedPrice;
            }
        }

        // Streamz
        if (this.state.streamz.enabled) {
            const tier = this.entertainmentData.entertainment.streamz.tiers.find(t => t.id === this.state.streamz.selectedTier);
            const discountedPrice = this.getEntertainmentDiscountedPrice(tier.price, false, 'streamz', this.state.streamz.selectedTier);
            total += discountedPrice;
            if (hasComboDiscount && this.state.welcomeGiftService !== 'streamz') {
                totalDiscount += tier.price - discountedPrice;
            }
        }

        // HBO
        if (this.state.hbo.enabled) {
            const tier = this.entertainmentData.entertainment.hbo.tiers.find(t => t.id === this.state.hbo.selectedTier);
            const discountedPrice = this.getEntertainmentDiscountedPrice(tier.price, false, 'hbo', this.state.hbo.selectedTier);
            total += discountedPrice;
            if (hasComboDiscount && this.state.welcomeGiftService !== 'hbo') {
                totalDiscount += tier.price - discountedPrice;
            }
        }

        // Disney
        if (this.state.disney.enabled) {
            const discountedPrice = this.getEntertainmentDiscountedPrice(this.entertainmentData.entertainment.disney.price, false, 'disney');
            total += discountedPrice;
            if (hasComboDiscount && this.state.welcomeGiftService !== 'disney') {
                totalDiscount += this.entertainmentData.entertainment.disney.price - discountedPrice;
            }
        }

        // Sport
        if (this.state.sport.enabled) {
            const discountedPrice = this.getEntertainmentDiscountedPrice(this.entertainmentData.entertainment.sport.price, false, 'sport');
            total += discountedPrice;
            if (hasComboDiscount && this.state.welcomeGiftService !== 'sport') {
                totalDiscount += this.entertainmentData.entertainment.sport.price - discountedPrice;
            }
        }

        // Cinema
        if (this.state.cinema.enabled) {
            const discountedPrice = this.getEntertainmentDiscountedPrice(this.entertainmentData.entertainment.cinema.price, false, 'cinema');
            total += discountedPrice;
            if (hasComboDiscount && this.state.welcomeGiftService !== 'cinema') {
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

        // Entertainment Box temporary discount (independent calculation) - removed as no discount is applied



        // Add WiFi pods standalone discount period
        if (this.state.wifiPods.enabled && this.state.wifiPods.count > 0) {
            const wifiPodsData = this.data.products.wifiPods;
            if (wifiPodsData.discountPeriod) {
                const podsOriginalPrice = this.state.wifiPods.count * wifiPodsData.pricePerPod;
                totalTemporaryDiscount += podsOriginalPrice * wifiPodsData.discountPeriod;
                discountsInfo.push({
                    product: 'WiFi-pods (standalone)',
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

        console.log("=== DEBUG: Calculating shortest discount period ===");
        console.log("Current state:", {
            internet: this.state.internet,
            mobile: this.state.mobile,
            tv: this.state.tv,
            entertainmentBox: this.state.entertainmentBox,
            wifiPods: this.state.wifiPods
        });

        // Check all temporary discount periods - only include if discount is actually applied
        if (this.state.internet.enabled) {
            const internetTier = this.data.products.internet.tiers.find(t => t.id === this.state.internet.selectedTier);
            console.log("Internet tier:", internetTier);
            if (internetTier && internetTier.discountPeriod && internetTier.discountValue) {
                periods.push(internetTier.discountPeriod);
                console.log("Added internet discount period:", internetTier.discountPeriod);
            }
        }

        if (this.state.mobile.enabled) {
            this.state.mobile.simcards.forEach((simcard, index) => {
                const mobileTier = this.data.products.mobile.tiers.find(t => t.id === simcard.selectedTier);
                console.log(`Mobile tier ${index}:`, mobileTier);
                if (mobileTier && mobileTier.discountPeriod && mobileTier.discountValue) {
                    periods.push(mobileTier.discountPeriod);
                    console.log(`Added mobile discount period ${index}:`, mobileTier.discountPeriod);
                }
            });
        }

        if (this.state.tv.enabled) {
            const tvData = this.data.products.tv;
            console.log("TV data:", tvData);
            if (tvData && tvData.discountPeriod && tvData.discountValue) {
                periods.push(tvData.discountPeriod);
                console.log("Added TV discount period:", tvData.discountPeriod);
            }

            if (tvData && tvData.entertainmentBox && tvData.entertainmentBox.tiers) {
                const entertainmentBoxTier = tvData.entertainmentBox.tiers.find(t => t.id === this.state.tv.entertainmentBoxTier);
                console.log("Entertainment box tier (from TV):", entertainmentBoxTier);
                if (entertainmentBoxTier && entertainmentBoxTier.discountPeriod && entertainmentBoxTier.discountValue) {
                    periods.push(entertainmentBoxTier.discountPeriod);
                    console.log("Added entertainment box discount period (from TV):", entertainmentBoxTier.discountPeriod);
                }
            }
        }

        if (this.state.entertainmentBox.enabled) {
            const entertainmentBoxData = this.data.products.entertainmentBox;
            console.log("Standalone entertainment box data:", entertainmentBoxData);
            if (entertainmentBoxData && entertainmentBoxData.discountPeriod && entertainmentBoxData.discountValue) {
                periods.push(entertainmentBoxData.discountPeriod);
                console.log("Added standalone entertainment box discount period:", entertainmentBoxData.discountPeriod);
            }
        }

        // WiFi-pods discount period - has special discount logic (free for period)
        if (this.state.wifiPods.enabled && this.state.wifiPods.count > 0) {
            const wifiPodsData = this.data.products.wifiPods;
            console.log("WiFi pods data:", wifiPodsData);
            if (wifiPodsData && wifiPodsData.discountPeriod) {
                periods.push(wifiPodsData.discountPeriod);
                console.log("Added WiFi pods discount period:", wifiPodsData.discountPeriod);
            }
        }

        const result = periods.length > 0 ? Math.min(...periods) : 0;
        console.log("All discount periods found:", periods);
        console.log("Shortest discount period calculated:", result);
        console.log("=== END DEBUG ===");

        return result; // Return 0 if no periods found
    }

    updateCostSummary() {
        const { total, totalDiscount, totalPermanentDiscount, totalTemporaryDiscount } = this.calculateTotal();

        // Update summary title and pricing tiers
        this.updateSummaryTitle(totalTemporaryDiscount);
        this.updateTemporaryPricingTiers(total, totalTemporaryDiscount);

        // Update main summary total
        const monthlyTotalElement = document.getElementById('monthly-total');
        if (monthlyTotalElement) {
            // Color the price pink if there are temporary discounts
            if (totalTemporaryDiscount > 0) {
                monthlyTotalElement.parentElement.style.color = '#F134F7';
            } else {
                monthlyTotalElement.parentElement.style.color = '#2D3648';
            }
            monthlyTotalElement.textContent = total.toFixed(2).replace('.', ',');
        }

        // Update mobile summary
        const mobileMonthlyTotalElement = document.getElementById('mobile-monthly-total');
        const mobileCostLabel = document.getElementById('mobile-cost-label');
        if (mobileMonthlyTotalElement && mobileCostLabel) {
            if (totalTemporaryDiscount > 0) {
                mobileMonthlyTotalElement.parentElement.style.color = '#F134F7';
                const shortestDuration = this.getShortestTemporaryDiscountPeriod();
                const durationText = shortestDuration === 1 ? 'maand' : 'maanden';
                mobileCostLabel.textContent = `eerste ${shortestDuration} ${durationText}`;
            } else {
                mobileMonthlyTotalElement.parentElement.style.color = '#2D3648';
                mobileCostLabel.textContent = 'per maand';
            }
            mobileMonthlyTotalElement.textContent = total.toFixed(2).replace('.', ',');
        }

        // Update advantage display
        const advantageBlock = document.getElementById('advantage-block');
        const mobileAdvantage = document.getElementById('mobile-advantage');

        if (totalTemporaryDiscount > 0 || totalPermanentDiscount > 0) {
            if (advantageBlock) {
                advantageBlock.style.display = 'flex';
                const advantageAmountElement = document.getElementById('advantage-amount');
                if (advantageAmountElement) {
                    advantageAmountElement.textContent = 'Bekijk je promoties';
                }
            }

            if (mobileAdvantage) {
                mobileAdvantage.style.display = 'block';
                const mobileAdvantageAmountElement = document.getElementById('mobile-advantage-amount');
                if (mobileAdvantageAmountElement) {
                    mobileAdvantageAmountElement.textContent = 'Bekijk je promoties';
                }
            }
        } else {
            if (advantageBlock) advantageBlock.style.display = 'none';
            if (mobileAdvantage) mobileAdvantage.style.display = 'none';
        }

        // Update product overview
        this.updateProductOverview();
    }

    updateSummaryTitle(totalTemporaryDiscount) {
        const summaryTitleElement = document.getElementById('summary-title');
        if (!summaryTitleElement) return;

        console.log("=== DEBUG: Updating summary title ===");
        console.log("Total temporary discount:", totalTemporaryDiscount);

        if (totalTemporaryDiscount > 0) {
            const shortestDuration = this.getShortestTemporaryDiscountPeriod();
            const durationText = shortestDuration === 1 ? 'maand' : 'maanden';
            const titleText = `Eerste ${shortestDuration} ${durationText}`;
            console.log("Setting summary title to:", titleText);
            summaryTitleElement.textContent = titleText;
        } else {
            console.log("No temporary discounts, setting title to: Totaal per maand");
            summaryTitleElement.textContent = 'Totaal per maand';
        }
        console.log("=== END DEBUG ===");
    }

    updateTemporaryPricingTiers(currentTotal, totalTemporaryDiscount) {
        const tiersContainer = document.getElementById('temporary-pricing-tiers');
        if (!tiersContainer) return;

        if (totalTemporaryDiscount === 0) {
            tiersContainer.style.display = 'none';
            return;
        }

        // Get all unique discount periods and sort them
        const allPeriods = this.getAllTemporaryDiscountPeriods();
        const uniquePeriods = [...new Set(allPeriods)].sort((a, b) => a - b);

        // Show tiers if there are any temporary discounts (even just 1 duration)
        if (uniquePeriods.length === 0) {
            tiersContainer.style.display = 'none';
            return;
        }

        // Calculate price progression
        let cumulativePrice = currentTotal;
        const priceProgression = [];

        uniquePeriods.forEach((period, index) => {
            // Find all discounts that expire at this period
            const expiringDiscounts = this.getExpiringDiscountsAtPeriod(period);
            const totalExpiringDiscount = expiringDiscounts.reduce((sum, d) => sum + d.discountValue, 0);

            cumulativePrice += totalExpiringDiscount;

            const isLastPeriod = index === uniquePeriods.length - 1;
            const label = isLastPeriod ?
                `Je prijs na ${period} maanden` :
                `Je promoprijs na ${period} maanden`;
            const priceClass = isLastPeriod ? 'final' : 'temporary';

            priceProgression.push({
                label: label,
                price: cumulativePrice,
                priceClass: priceClass
            });
        });

        // Generate HTML for pricing tiers
        const tiersHTML = priceProgression.map(tier => `
            <div class="pricing-tier">
                <div class="pricing-tier-label">${tier.label}</div>
                <div class="pricing-tier-price ${tier.priceClass}">€ ${tier.price.toFixed(2).replace('.', ',')}</div>
            </div>
        `).join('');

        tiersContainer.innerHTML = tiersHTML;
        tiersContainer.style.display = 'block';
    }

    getAllTemporaryDiscountPeriods() {
        const periods = [];

        // Internet discount period
        if (this.state.internet.enabled) {
            const internetTier = this.data.products.internet.tiers.find(t => t.id === this.state.internet.selectedTier);
            if (internetTier.discountPeriod) {
                periods.push(internetTier.discountPeriod);
            }
        }

        // Mobile discount periods
        if (this.state.mobile.enabled) {
            this.state.mobile.simcards.forEach((simcard) => {
                const mobileTier = this.data.products.mobile.tiers.find(t => t.id === simcard.selectedTier);
                if (mobileTier.discountPeriod) {
                    periods.push(mobileTier.discountPeriod);
                }
            });
        }

        // TV discount period
        if (this.state.tv.enabled) {
            const tvData = this.data.products.tv;
            if (tvData.discountPeriod) {
                periods.push(tvData.discountPeriod);
            }
        }

        // WiFi-pods discount period
        if (this.state.wifiPods.enabled && this.state.wifiPods.count > 0) {
            const wifiPodsData = this.data.products.wifiPods;
            if (wifiPodsData.discountPeriod) {
                periods.push(wifiPodsData.discountPeriod);
            }
        }

        return periods;
    }

    getExpiringDiscountsAtPeriod(period) {
        const expiringDiscounts = [];

        // Internet discount
        if (this.state.internet.enabled) {
            const internetTier = this.data.products.internet.tiers.find(t => t.id === this.state.internet.selectedTier);
            if (internetTier.discountPeriod === period) {
                expiringDiscounts.push({
                    product: 'Internet',
                    discountValue: internetTier.discountValue
                });
            }
        }

        // Mobile discounts
        if (this.state.mobile.enabled) {
            this.state.mobile.simcards.forEach((simcard, index) => {
                const mobileTier = this.data.products.mobile.tiers.find(t => t.id === simcard.selectedTier);
                if (mobileTier.discountPeriod === period) {
                    expiringDiscounts.push({
                        product: `Simkaart ${simcard.id}`,
                        discountValue: mobileTier.discountValue
                    });
                }
            });
        }

        // TV discount
        if (this.state.tv.enabled) {
            const tvData = this.data.products.tv;
            if (tvData.discountPeriod === period) {
                expiringDiscounts.push({
                    product: 'TV',
                    discountValue: tvData.discountValue
                });
            }
        }

        // WiFi-pods discount
        if (this.state.wifiPods.enabled && this.state.wifiPods.count > 0) {
            const wifiPodsData = this.data.products.wifiPods;
            if (wifiPodsData.discountPeriod === period) {
                const podsOriginalPrice = this.state.wifiPods.count * wifiPodsData.pricePerPod;
                expiringDiscounts.push({
                    product: 'WiFi-pods',
                    discountValue: podsOriginalPrice
                });
            }
        }

        return expiringDiscounts;
    }

    updateProductOverview() {
        const overviewContent = document.getElementById('product-overview-content');
        if (!overviewContent || !this.data) return;

        let overviewHtml = '';

        // Internet
        if (this.state.internet && this.state.internet.enabled) {
            const internetTier = this.data.products.internet.tiers.find(t => t.id === this.state.internet.selectedTier);
            if (!internetTier) return;

            let priceHtml;

            if (internetTier.discountValue) {
                const discountedPrice = internetTier.price - internetTier.discountValue;
                priceHtml = `
                    <div class="price-layout">
                        <div class="price-main">
                            <span class="original-price">€${internetTier.price.toFixed(2).replace('.', ',')}</span>
                            <span class="discount-price">€${discountedPrice.toFixed(2).replace('.', ',')}</span>
                        </div>
                        <div class="discount-duration">gedurende ${internetTier.discountPeriod} maanden</div>
                    </div>
                `;
            } else {
                priceHtml = `€${internetTier.price.toFixed(2).replace('.', ',')}`;
            }

            overviewHtml += `
                <div class="overview-group">
                    <div class="overview-group-title">Internet</div>
                    <div class="overview-item">
                        <span class="overview-item-name">${internetTier.title}</span>
                        <span class="overview-item-price">${priceHtml}</span>
                    </div>
            `;

            // Add WiFi-pods to Internet section if enabled
            if (this.state.wifiPods && this.state.wifiPods.enabled && this.state.wifiPods.count > 0) {
                const wifiPodsData = this.data.products.wifiPods;
                const originalPrice = this.state.wifiPods.count * wifiPodsData.pricePerPod;
                const wifiPodsPriceHtml = `
                    <div class="price-layout">
                        <div class="price-main">
                            <span class="original-price">€${originalPrice.toFixed(2).replace('.', ',')}</span>
                            <span class="discount-price">€0,00</span>
                        </div>
                        <div class="discount-duration">gedurende ${wifiPodsData.discountPeriod} maanden</div>
                    </div>
                `;
                overviewHtml += `
                    <div class="overview-item">
                        <span class="overview-item-name">${this.state.wifiPods.count} Wifi-pods</span>
                        <span class="overview-item-price">${wifiPodsPriceHtml}</span>
                    </div>
                `;
            }

            overviewHtml += `</div>`;
        }

        // Mobile
        if (this.state.mobile && this.state.mobile.enabled && this.state.mobile.simcards && this.state.mobile.simcards.length > 0) {
            overviewHtml += `
                <div class="overview-group">
                    <div class="overview-group-title">Mobiel</div>
            `;

            this.state.mobile.simcards.forEach((simcard, index) => {
                const mobileTier = this.data.products.mobile.tiers.find(t => t.id === simcard.selectedTier);
                if (!mobileTier) return;

                const discountCalc = this.calculateMobileDiscount(mobileTier, index);

                let priceHtml;

                if (discountCalc.hasDiscount) {
                    if (discountCalc.permanentDiscountAmount > 0 && discountCalc.temporaryDiscountAmount > 0) {
                        const priceAfterPermanent = mobileTier.price - discountCalc.permanentDiscountAmount;
                        priceHtml = `
                            <div class="price-layout">
                                <div class="price-main">
                                    <span class="original-price">€${priceAfterPermanent.toFixed(2).replace('.', ',')}</span>
                                    <span class="discount-price">€${discountCalc.finalPrice.toFixed(2).replace('.', ',')}</span>
                                </div>
                                <div class="discount-duration">gedurende ${mobileTier.discountPeriod} maanden</div>
                            </div>
                        `;
                    } else if (discountCalc.permanentDiscountAmount > 0) {
                        priceHtml = `€${discountCalc.finalPrice.toFixed(2).replace('.', ',')}`;
                    } else if (discountCalc.temporaryDiscountAmount > 0) {
                        priceHtml = `
                            <div class="price-layout">
                                <div class="price-main">
                                    <span class="original-price">€${mobileTier.price.toFixed(2).replace('.', ',')}</span>
                                    <span class="discount-price">€${discountCalc.finalPrice.toFixed(2).replace('.', ',')}</span>
                                </div>
                                <div class="discount-duration">gedurende ${mobileTier.discountPeriod} maanden</div>
                            </div>
                        `;
                    }
                } else {
                    priceHtml = `€${mobileTier.price.toFixed(2).replace('.', ',')}`;
                }

                overviewHtml += `
                    <div class="overview-item">
                        <span class="overview-item-name">SIM ${index + 1}</span>
                        <span class="overview-item-price">${priceHtml}</span>
                    </div>
                `;
            });

            overviewHtml += `</div>`;
        }

        // TV (including Entertainment Box when TV is enabled OR Entertainment Box standalone)
        if ((this.state.tv && this.state.tv.enabled) || (this.state.entertainmentBox && this.state.entertainmentBox.enabled)) {
            overviewHtml += `<div class="overview-group"><div class="overview-group-title">TV</div>`;

            // Add TV item only if TV is enabled
            if (this.state.tv && this.state.tv.enabled) {
                const tvData = this.data.products.tv;
                if (!tvData) return;

                let tvPriceHtml;

                if (tvData.discountValue) {
                    const discountedPrice = tvData.price - tvData.discountValue;
                    tvPriceHtml = `
                        <div class="price-layout">
                            <div class="price-main">
                                <span class="original-price">€${tvData.price.toFixed(2).replace('.', ',')}</span>
                                <span class="discount-price">€${discountedPrice.toFixed(2).replace('.', ',')}</span>
                            </div>
                            <div class="discount-duration">gedurende ${tvData.discountPeriod} maanden</div>
                        </div>
                    `;
                } else {
                    tvPriceHtml = `€${(tvData.price).toFixed(2).replace('.', ',')}`;
                }

                overviewHtml += `
                    <div class="overview-item">
                        <span class="overview-item-name">Full linear</span>
                        <span class="overview-item-price">${tvPriceHtml}</span>
                    </div>
                `;
            }

            // Add Entertainment Box (always use standalone data for pricing when enabled)
            if (this.state.entertainmentBox && this.state.entertainmentBox.enabled) {
                const entertainmentBoxData = this.data.products.entertainmentBox;
                if (entertainmentBoxData && entertainmentBoxData.price !== undefined) {
                    // Always show base price without discount for Entertainment Box
                    const boxPriceHtml = `€${entertainmentBoxData.price.toFixed(2).replace('.', ',')}`;

                    overviewHtml += `
                        <div class="overview-item">
                            <span class="overview-item-name">Entertainment Hub</span>
                            <span class="overview-item-price">${boxPriceHtml}</span>
                        </div>
                    `;
                }
            }

            overviewHtml += `</div>`;
        }



        // Fixed Phone
        if (this.state.fixedPhone && this.state.fixedPhone.enabled) {
            const phoneData = this.data.products.fixedPhone;
            if (phoneData && phoneData.price !== undefined) {
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
        }



        // Entertainment services
        if (this.state.selectedEntertainmentServices && this.entertainmentData) {
            const selectedServices = Array.from(this.state.selectedEntertainmentServices);
            if (selectedServices.length > 0) {
                overviewHtml += `
                    <div class="overview-group">
                        <div class="overview-group-title">Entertainment</div>
                `;

                selectedServices.forEach(serviceKey => {
                    const serviceData = this.entertainmentData.entertainment[serviceKey];
                    if (!serviceData) return;

                    const serviceName = this.getServiceDisplayName(serviceKey);

                    let priceHtml;
                    if (serviceData.tiers) {
                        const tier = serviceData.tiers.find(t => t.id === this.state[serviceKey].selectedTier);
                        if (!tier) return;

                        const discountedPrice = this.getEntertainmentDiscountedPrice(tier.price);
                        const hasDiscount = discountedPrice < tier.price;

                        // Entertainment services only have permanent discounts, so never show pink styling
                        priceHtml = `€${discountedPrice.toFixed(2).replace('.', ',')}`;
                    } else {
                        const discountedPrice = this.getEntertainmentDiscountedPrice(serviceData.price);
                        const hasDiscount = discountedPrice < serviceData.price;

                        // Entertainment services only have permanent discounts, so never show pink styling
                        priceHtml = `€${discountedPrice.toFixed(2).replace('.', ',')}`;
                    }

                    overviewHtml += `
                        <div class="overview-item">
                            <span class="overview-item-name">${serviceName}</span>
                            <span class="overview-item-price">${priceHtml}</span>
                        </div>
                    `;
                });

                overviewHtml += `</div>`;
            }
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

    openStreamingTierSheet(serviceKey) {
        this.currentStreamingService = serviceKey;
        this.isEditingStreamingService = false;

        const overlay = document.getElementById('streaming-tier-sheet-overlay');
        const sheet = document.getElementById('streaming-tier-sheet');
        const icon = document.getElementById('tier-sheet-icon');
        const title = document.getElementById('tier-sheet-title');

        if (!overlay || !sheet || !icon || !title) return;

        // Set service icon and title
        const serviceName = this.getServiceDisplayName(serviceKey);
        const iconClass = this.getServiceIconClass(serviceKey);
        const iconHtml = this.getServiceIcon(serviceKey);

        icon.className = `service-icon-large ${iconClass}`;
        icon.innerHTML = iconHtml;
        title.textContent = serviceName;

        // Render tier options
        this.renderStreamingTierOptions(serviceKey);

        overlay.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }

    closeStreamingTierSheet() {
        const overlay = document.getElementById('streaming-tier-sheet-overlay');
        if (overlay) {
            overlay.style.display = 'none';
            document.body.style.overflow = '';
        }
    }

    renderStreamingTierOptions(serviceKey) {
        const serviceData = this.entertainmentData.entertainment[serviceKey];
        if (!serviceData) return;

        const container = document.getElementById('tier-selection-container');
        const detailsContainer = document.getElementById('tier-sheet-details');
        const pricingContainer = document.getElementById('tier-sheet-pricing');
        const subtitleElement = document.querySelector('.tier-selection-subtitle');

        if (!container || !detailsContainer || !pricingContainer) return;

        // Check if this would be the Welcome Gift service (no service has been assigned yet)
        const isWelcomeGift = this.state.welcomeGiftService === null;

        // Hide subtitle if no tiers
        if (!serviceData.tiers) {
            if (subtitleElement) subtitleElement.classList.add('hidden');
            container.style.display = 'none';

            // Show service details for single-tier services
            const summaryItems = serviceData.summary.split(', ').map(item => `<li>${item}</li>`).join('');
            detailsContainer.innerHTML = `<ul class="tier-details">${summaryItems}</ul>`;

            // Show pricing with Welcome Gift if applicable
            let priceHtml;

            if (isWelcomeGift && serviceData.welcomeGift) {
                const originalPrice = serviceData.price;
                const welcomePrice = serviceData.welcomeGift.price;

                priceHtml = `
                    <div class="tier-pricing">
                        <div class="original-price">€ ${originalPrice.toFixed(2).replace('.', ',')}</div>
                        <div class="welcome-gift-pricing">
                            <span class="welcome-gift-badge">Welkomstcadeau</span>
                            <div class="discount-price">€${welcomePrice.toFixed(2).replace('.', ',')}<span>/maand</span></div>
                        </div>
                        <div class="discount-info">gedurende ${serviceData.welcomeGift.duration} maanden</div>
                    </div>
                `;
            } else {
                const discountedPrice = this.getEntertainmentDiscountedPrice(serviceData.price);
                priceHtml = `<div class="tier-pricing">€${discountedPrice.toFixed(2).replace('.', ',')}<span>/maand</span></div>`;
            }

            pricingContainer.innerHTML = priceHtml;
            return;
        }

        // Show subtitle for tier-based services
        if (subtitleElement) subtitleElement.classList.remove('hidden');
        container.style.display = 'flex';

        // Set initial selected tier
        this.tempSelectedTier = this.state[serviceKey].selectedTier;

        // Render tier options
        const tiersHtml = serviceData.tiers.map(tier => {
            const isSelected = tier.id === this.tempSelectedTier;

            let priceText;
            let priceClass = '';
            if (isWelcomeGift && tier.welcomeGift) {
                priceText = `€${tier.welcomeGift.price.toFixed(2).replace('.', ',')}`;
                priceClass = 'promotional-price';
            } else {
                const discountedPrice = this.getEntertainmentDiscountedPrice(tier.price, false, serviceKey, tier.id);
                priceText = `€${discountedPrice.toFixed(2).replace('.', ',')}`;
            }

            return `
                <div class="tier-selection-option ${isSelected ? 'active' : ''}" onclick="app.selectTierInSheet(${tier.id})">
                    <div class="tier-name">${tier.title}</div>
                    <div class="tier-price ${priceClass}">${priceText}</div>
                </div>
            `;
        }).join('');

        container.innerHTML = tiersHtml;

        // Update details and pricing for selected tier
        this.updateTierSheetDetails(serviceKey);
    }

    selectTierInSheet(tierId) {
        this.tempSelectedTier = tierId;
        this.renderStreamingTierOptions(this.currentStreamingService);
    }

    updateTierSheetDetails(serviceKey) {
        const serviceData = this.entertainmentData.entertainment[serviceKey];
        const tier = serviceData.tiers.find(t => t.id === this.tempSelectedTier);

        if (!tier) return;

        const detailsContainer = document.getElementById('tier-sheet-details');
        const pricingContainer = document.getElementById('tier-sheet-pricing');

        if (!detailsContainer || !pricingContainer) return;

        // Show tier details
        const summaryItems = tier.summary.split(', ').map(item => `<li>${item}</li>`).join('');
        detailsContainer.innerHTML = `<ul class="tier-details">${summaryItems}</ul>`;

        // Show pricing with Welcome Gift if applicable
        let priceHtml;
        const isWelcomeGift = this.state.welcomeGiftService === null; // This would be the welcome gift service

        if (isWelcomeGift && tier.welcomeGift) {
            const originalPrice = tier.price;
            const welcomePrice = tier.welcomeGift.price;

            priceHtml = `
                <div class="tier-pricing">
                    <div class="original-price">€ ${originalPrice.toFixed(2).replace('.', ',')}</div>
                    <div class="welcome-gift-pricing">
                        <span class="welcome-gift-badge">Welkomstcadeau</span>
                        <div class="discount-price">€${welcomePrice.toFixed(2).replace('.', ',')}<span>/maand</span></div>
                    </div>
                    <div class="discount-info">gedurende ${tier.welcomeGift.duration} maanden</div>
                </div>
            `;
        } else {
            const discountedPrice = this.getEntertainmentDiscountedPrice(tier.price);
            const hasDiscount = discountedPrice < tier.price;

            if (hasDiscount) {
                priceHtml = `
                    <div class="tier-pricing">
                        <div class="tier-price">€${discountedPrice.toFixed(2).replace('.', ',')}<span>/maand</span></div>
                        <div class="tier-sheet-discount-tag" onclick="app.openComboDiscountSheet('entertainmentCombo')">
                            <span class="discount-tag-text">5% permanente korting toegepast</span>
                            <img src="final_assets/icons/i-icon-blue.svg" alt="info" class="info-icon">
                        </div>
                    </div>
                `;
            } else {
                priceHtml = `<div class="tier-pricing">€${tier.price.toFixed(2).replace('.', ',')}<span>/maand</span></div>`;
            }
        }

        pricingContainer.innerHTML = priceHtml;
    }

    confirmStreamingTierSelection() {
        if (!this.currentStreamingService) return;

        // Update the tier selection
        this.state[this.currentStreamingService].selectedTier = this.tempSelectedTier;

        // Assign welcome gift if this is the first service
        if (this.state.welcomeGiftService === null) {
            this.assignWelcomeGift(this.currentStreamingService);
        }

        // Update displays
        this.renderSelectedEntertainmentServices();
        this.updateCostSummary();

        // Close sheet
        this.closeStreamingTierSheet();
    }

    addEntertainmentService(serviceKey) {
        // Add service to selected list
        this.state.selectedEntertainmentServices.add(serviceKey);
        this.state[serviceKey].enabled = true;

        // Assign welcome gift if this is the first service
        if (this.state.welcomeGiftService === null) {
            this.assignWelcomeGift(serviceKey);
        }

        // If service has tiers, open tier selection sheet
        const serviceData = this.entertainmentData.entertainment[serviceKey];
        if (serviceData && serviceData.tiers) {
            this.openStreamingTierSheet(serviceKey);
            return;
        }

        // Update displays for services without tiers
        this.renderAvailableEntertainmentServices();
        this.renderSelectedEntertainmentServices();
        this.refreshAllEntertainmentProductInfo();
        this.updateCostSummary();
    }

    editStreamingService(serviceKey) {
        this.isEditingStreamingService = true;

        // If service has tiers, open tier selection sheet
        const serviceData = this.entertainmentData.entertainment[serviceKey];
        if (serviceData && serviceData.tiers) {
            this.openStreamingTierSheet(serviceKey);
        }
    }

    renderAvailableEntertainmentServices() {
        const container = document.getElementById('available-services-grid');
        if (!container || !this.entertainmentData) return;

        const services = [
            { key: 'netflix', name: 'Netflix', iconClass: 'netflix-icon' },
            { key: 'disney', name: 'Disney+', iconClass: 'disney-icon' },
            { key: 'hbo', name: 'HBO Max', iconClass: 'hbo-icon' },
            { key: 'streamz', name: 'Streamz', iconClass: 'streamz-icon' },
            { key: 'sport', name: 'Sport', iconClass: 'sport-icon' },
            { key: 'cinema', name: 'Cinema', iconClass: 'cinema-icon' }
        ];

        const hasWelcomeGift = this.state.welcomeGiftService !== null;
        const availableServices = services.filter(service => !this.state.selectedEntertainmentServices.has(service.key));

        // Add Welcome Gift header if no service has been selected yet
        let welcomeGiftHeader = '';
        if (!hasWelcomeGift && availableServices.length > 0) {
            welcomeGiftHeader = `
                <div class="welcome-gift-header">
                    <div class="welcome-gift-icon">🎁</div>
                    <div class="welcome-gift-text">
                        <div class="welcome-gift-title">1 jaar gratis streamen!</div>
                        <div class="welcome-gift-subtitle">Je krijgt 1 jaar lang een gigantische korting op 1 streamingdienst naar keuze</div>
                        <div class="welcome-gift-note">Heb je al een account op 1 van deze diensten? Die kan je makkelijk overzetten.</div>
                    </div>
                </div>
            `;
        }

        const servicesHtml = availableServices.map(service => {
            const serviceData = this.entertainmentData.entertainment[service.key];
            let priceText;

            // Check if this would be the second service to show discounted price
            const currentlyEnabled = this.state.selectedEntertainmentServices.size;
            const isSecondService = currentlyEnabled === 1;

            // Don't show prices when Welcome Gift is available
            if (!hasWelcomeGift) {
                priceText = ''; // Hide price when welcome gift is available
            } else {
                if (serviceData.tiers) {
                    const minPrice = Math.min(...serviceData.tiers.map(tier => this.getEntertainmentDiscountedPrice(tier.price, isSecondService)));
                    priceText = `Vanaf € ${minPrice.toFixed(2).replace('.', ',')}`;
                } else {
                    const discountPrice = this.getEntertainmentDiscountedPrice(serviceData.price, isSecondService);
                    priceText = `€ ${discountPrice.toFixed(2).replace('.', ',')}`;
                }
            }

            const iconHtml = this.getServiceIcon(service.key);

            return `
                <div class="available-service" onclick="app.addEntertainmentService('${service.key}')">
                    <div class="service-icon ${service.iconClass}">${iconHtml}</div>
                    <div class="available-service-content">
                        <div class="available-service-name">${service.name}</div>
                        ${priceText ? `<div class="available-service-price">${priceText}</div>` : ''}
                    </div>
                    <div class="add-service-icon">+</div>
                </div>
            `;
        }).join('');

        // Apply Welcome Gift styling to container
        if (!hasWelcomeGift && availableServices.length > 0) {
            container.classList.add('welcome-gift-container');
            container.innerHTML = welcomeGiftHeader + servicesHtml;
        } else {
            container.classList.remove('welcome-gift-container');
            container.innerHTML = servicesHtml;
        }
    }

    renderSelectedEntertainmentServices() {
        const container = document.getElementById('selected-entertainment-services');
        const comboDiscountBanner = document.getElementById('combo-discount-banner');

        if (!container || !this.entertainmentData) return;

        const selectedServices = Array.from(this.state.selectedEntertainmentServices);

        // Show/hide combo discount banner
        if (comboDiscountBanner) {
            if (selectedServices.length >= 2) {
                comboDiscountBanner.style.display = 'block';
            } else {
                comboDiscountBanner.style.display = 'none';
            }
        }

        // Clear existing selected services (but keep the banner)
        const existingServices = container.querySelectorAll('.selected-service-card');
        existingServices.forEach(service => service.remove());

        selectedServices.forEach(serviceKey => {
            const serviceData = this.entertainmentData.entertainment[serviceKey];
            const serviceName = this.getServiceDisplayName(serviceKey);
            const iconClass = this.getServiceIconClass(serviceKey);
            const icon = this.getServiceIcon(serviceKey);

            // Get tier information
            let tierName = '';
            let price = serviceData.price || 0;

            if (serviceData.tiers) {
                const tier = serviceData.tiers.find(t => t.id === this.state[serviceKey].selectedTier);
                if (tier) {
                    tierName = tier.title;
                    price = tier.price;
                }
            }

            const discountedPrice = this.getEntertainmentDiscountedPrice(price, false, serviceKey, this.state[serviceKey].selectedTier);
            const hasDiscount = discountedPrice < price;

            const isWelcomeGift = this.state.welcomeGiftService === serviceKey;

            const serviceElement = document.createElement('div');
            serviceElement.className = `selected-service-card ${isWelcomeGift ? 'welcome-gift-service' : ''}`;
            serviceElement.innerHTML = `
                <div class="selected-service-header">
                    <div class="service-icon ${iconClass}">${icon}</div>
                    <div class="selected-service-info">
                        <div class="selected-service-name">${serviceName}</div>
                        ${tierName ? `<div class="selected-service-tier">${tierName}</div>` : ''}
                        ${isWelcomeGift ? '<div class="welcome-gift-badge">Welkomstcadeau</div>' : ''}
                    </div>
                    <div class="selected-service-actions">
                        <button class="edit-service-btn" onclick="app.editStreamingService('${serviceKey}')" title="Wijzig plan">✏️</button>
                    </div>
                </div>
                <div class="selected-service-divider"></div>
                <div class="selected-service-pricing">
                    <div class="selected-service-price-section">
                        <div class="selected-service-price">€${discountedPrice.toFixed(2).replace('.', ',')}<span class="selected-service-period">/maand</span></div>
                        ${isWelcomeGift ? this.getWelcomeGiftDiscountInfo(serviceKey) : ''}
                        ${hasDiscount && !isWelcomeGift ? `
                            <div class="combo-discount-tag" onclick="app.openComboDiscountSheet('entertainmentCombo')">
                                <span>5% permanente korting toegepast</span>
                                <img src="final_assets/icons/i-icon-blue.svg" alt="info" class="info-icon">
                            </div>
                        ` : ''}
                    </div>
                </div>
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
            'netflix': '<img src="final_assets/icons/Netflix.svg" alt="Netflix">',
            'streamz': '<img src="final_assets/icons/Streamz.svg" alt="Streamz">',
            'disney': '<img src="final_assets/icons/Disney.svg" alt="Disney+">',
            'sport': '<img src="final_assets/icons/Sport.svg" alt="Sport">',
            'cinema': '<img src="final_assets/icons/Cinema.svg" alt="Cinema">',
            'hbo': '<img src="final_assets/icons/Hbo.svg" alt="HBO">'
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
            const discountedPrice = this.getEntertainmentDiscountedPrice(tier.price);
            const hasDiscount = discountedPrice < tier.price;
            const priceText = `€${discountedPrice.toFixed(2).replace('.', ',')}`;

            let subtitleContent = '';
            // For entertainment services, permanent discounts should use default color
            // Only temporary discounts (if any) should use promotional color
            subtitleContent = `<div class="tier-subtitle">${priceText}</div>`;

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
            // Permanent discount: show normal price with combo discount tag
            return `
                <div class="service-price-container">
                    <div class="service-price">€ ${discountedPrice.toFixed(2).replace('.', ',')}/maand</div>
                    <div class="combo-discount-tag" onclick="app.openComboDiscountSheet('entertainmentCombo')">
                        <span>Combokorting geactiveerd</span>
                    <img src="final_assets/icons/i-icon-blue.svg" alt="info" class="info-icon">
                    </div>
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
        // Always open tier selection sheet for all services
        this.openStreamingTierSheet(serviceKey);
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
        } else {
            // If the entertainment box block doesn't exist on this page, 
            // redirect to configurator page with entertainment box enabled
            window.location.href = 'configurator.html?tv=1&box=1';
        }
    }

    // Add method to remove product closed state
    removeProductClosedState(productType) {
        let blockId;
        if (productType === 'fixedPhone') {
            blockId = 'fixed-phone-block';
        } else if (productType === 'entertainmentBox') {
            blockId = 'entertainment-box-block';
        } else if (productType === 'wifiPods') {
            blockId = 'wifi-pods-block';
        } else {
            blockId = `${productType}-block`;
        }

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

        // Remove any highlight blocks if they exist
        const existingHighlight = productBlock.querySelector('.highlight-block');
        if (existingHighlight) {
            existingHighlight.remove();
        }
    }

    // Add method to render closed states for all disabled products
    renderClosedStatesForDisabledProducts() {
        const allProducts = ['internet', 'mobile', 'tv', 'fixedPhone', 'entertainment', 'entertainmentBox', 'wifiPods'];

        allProducts.forEach(productType => {
            // Only render closed state if the product exists in the DOM and is disabled
            let blockId;
            if (productType === 'fixedPhone') {
                blockId = 'fixed-phone-block';
            } else if (productType === 'entertainmentBox') {
                blockId = 'entertainment-box-block';
            } else if (productType === 'wifiPods') {
                blockId = 'wifi-pods-block';
            } else {
                blockId = `${productType}-block`;
            }

            const productBlock = document.getElementById(blockId);

            if (productBlock && this.state[productType] && !this.state[productType].enabled) {
                this.renderProductClosedState(productType);
            }
        });
    }

    // Add method to render product closed state
    renderProductClosedState(productType) {
        let blockId;
        if (productType === 'fixedPhone') {
            blockId = 'fixed-phone-block';
        } else if (productType === 'entertainmentBox') {
            blockId = 'entertainment-box-block';
        } else if (productType === 'wifiPods') {
            blockId = 'wifi-pods-block';
        } else {
            blockId = `${productType}-block`;
        }

        const productBlock = document.getElementById(blockId);

        if (!productBlock) return;

        // Remove existing closed state first
        this.removeProductClosedState(productType);

        // Get closed state data
        let closedStateData;
        /*
        if (productType === 'entertainment' && this.entertainmentData) {
            closedStateData = this.data?.closedStates?.[productType];
        } else if (productType === 'entertainmentBox') {
            // Check both data sources for entertainment box
            closedStateData = this.data?.closedStates?.[productType] || this.entertainmentData?.closedStates?.[productType];
        } else {
            closedStateData = this.data?.closedStates?.[productType];
        }
        */

        closedStateData = this.data?.closedStates?.[productType];

        console.log("Closed State info = ", closedStateData);

        if (!closedStateData) {
            console.log(`No closed state data found for ${productType}`);
            return;
        }

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
                    <img src="final_assets/streaming_icon_row.svg" alt="streaming diensten" />
                </div>
            `;
        }

        // Add special container for entertainment box
        if (productType === 'entertainmentBox' && closedStateData.showImage) {
            closedStateHtml += `
                <div class="entertainment-box-container">
                    <div class="entertainment-box-image">
                        <div class="box-image-wrap"><img src="final_assets/entertainment_box_1.jpg" /></div>
                    </div>
                    <div class="entertainment-box-content">
            `;
        }

        // Add summary
        closedStateHtml += `<div class="product-closed-summary">${summary}</div>`;

        // Add highlight if present
        if (closedStateData.highlight) {
            closedStateHtml += `
                <div class="promo-highlight">
                    <div class="highlight-title">${closedStateData.highlight.title}</div>
                    <div class="highlight-content">${closedStateData.highlight.content}</div>
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
            const entertainmentBoxData = this.data.products.entertainmentBox;
            const tvPrice = tvData.discountValue ? tvData.price - tvData.discountValue : tvData.price;
            const entertainmentBoxPrice = entertainmentBoxData ? entertainmentBoxData.price : 0;
            return tvPrice + entertainmentBoxPrice;
        } else if (productType === 'fixedPhone') {
            return this.data.products.fixedPhone.price;
        } else if (productType === 'entertainmentBox') {
            const standaloneData = this.data.products.entertainmentBox;
            if (standaloneData) {
                return standaloneData.discountValue ? standaloneData.price - standaloneData.discountValue : standaloneData.price;
            }
            return 5.00; // fallback
        } else if (productType === 'entertainment') {
            // For entertainment closed state, show lowest streaming service price
            if (this.entertainmentData && this.entertainmentData.entertainment) {
                const services = ['netflix', 'streamz', 'disney', 'sport', 'cinema', 'hbo'];
                let lowestPrice = Infinity;

                services.forEach(service => {
                    const serviceData = this.entertainmentData.entertainment[service];
                    if (serviceData) {
                        if (serviceData.tiers) {
                            const minTierPrice = Math.min(...serviceData.tiers.map(tier => tier.price));
                            lowestPrice = Math.min(lowestPrice, minTierPrice);
                        } else {
                            lowestPrice = Math.min(lowestPrice, serviceData.price);
                        }
                    }
                });

                return lowestPrice !== Infinity ? lowestPrice : 5.99;
            }
            return 5.99; // fallback
        } else if (productType === 'wifiPods') {
            const wifiPodsData = this.data.products.wifiPods;
            return wifiPodsData.pricePerPod; // Price for 1 pod
        }
        return 0;
    }

    updateMobileHighlightBlock() {
        const mobileBlock = document.getElementById('mobile-block');
        if (!mobileBlock) return;

        if (this.state.mobile.enabled) {
            // Remove any existing highlight blocks (check for all possible classes)
            const existingHighlights = mobileBlock.querySelectorAll('.highlight-block, .promo-highlight, .combo-discount-banner, .promo-highlight-open');
            existingHighlights.forEach(highlight => highlight.remove());
            let highlightHtml = '';
            let highlightClass = '';
            let highlightTitle = '';
            let highlightContent = '';

            if (!this.state.internet.enabled) {
                highlightClass = 'promo-highlight';
                highlightTitle = 'Combovoordeel Internet + Mobiel';
                highlightContent = 'Je mobiele abonnement <strong>aan 50%</strong>, als je het combineert met internet.';
            }
            // Remove the else block that shows the blue combo discount banner when internet is enabled

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
        // If mobile is disabled, don't remove highlights as they might be part of closed state
    }

    // Advantage bottomsheet methods
    openAdvantageBottomSheet() {
        const overlay = document.getElementById('advantage-sheet-overlay');
        const title = document.getElementById('advantage-sheet-title');
        const body = document.getElementById('advantage-sheet-body');

        if (!overlay || !title || !body) return;

        // Get temporary and permanent discount data
        const temporaryData = this.calculateTotalTemporaryDiscount();
        const permanentData = this.calculateTotalPermanentDiscount();
        const hasTemporaryDiscounts = temporaryData.total > 0;
        const hasPermanentDiscounts = permanentData.total > 0;

        // Create bundelvoordelen list - include both mobile and entertainment permanent discounts
        const bundleAdvantages = [];

        // Mobile permanent discounts
        if (this.state.mobile.enabled && this.state.internet.enabled) {
            this.state.mobile.simcards.forEach((simcard, index) => {
                const mobileTier = this.data.products.mobile.tiers.find(t => t.id === simcard.selectedTier);
                const permanentDiscount = this.data.discounts.permanent;
                if (permanentDiscount.enabled && permanentDiscount.conditions.applicableToTiers.includes(mobileTier.id)) {
                    bundleAdvantages.push(`<strong>50% korting</strong> op je ${index === 0 ? 'eerste' : index === 1 ? 'tweede' : `${index + 1}e`} mobiele abonnement (${mobileTier.title})`);
                }
            });
        }

        // Entertainment permanent discounts
        const enabledEntertainmentServices = this.getEnabledEntertainmentProductsCount();
        if (enabledEntertainmentServices >= 2) {
            bundleAdvantages.push(`<strong>5% korting</strong> op je streamingdiensten omdat je er 2 of meer combineert`);
        }

        const bundleAdvantagesList = bundleAdvantages.map(advantage =>
            `<li>${advantage}</li>`
        ).join('');

        title.textContent = 'Overzicht van je kortingen';

        if (hasTemporaryDiscounts) {
            // Show full advantage sheet with temporary discounts
            // Sort discounts by duration (shortest first)
            const sortedDiscounts = temporaryData.discounts.sort((a, b) => a.discountPeriod - b.discountPeriod);

            // Create discount overview
            const discountList = sortedDiscounts.map(discount =>
                `<li>${discount.discountPeriod} maanden <strong>€${discount.discountValue.toFixed(2).replace('.', ',')} korting</strong> op ${discount.product}</li>`
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
                description: `<strong>€${currentPrice.toFixed(2).replace('.', ',')}/maand</strong> gedurende de eerste ${uniquePeriods[0] || 3} maanden`
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
                    description: `<strong>€${cumulativePrice.toFixed(2).replace('.', ',')}/maand</strong> na ${period} maanden`
                });
            });

            const priceProgressionList = priceProgression.map(p => `<li>${p.description}</li>`).join('');

            body.innerHTML = `
                <div class="advantage-section">
                    <h4>Tijdelijke kortingen</h4>
                    <ul>
                        ${discountList}
                    </ul>
                </div>

                <div class="advantage-section">
                    <h4>Jouw prijs per maand</h4>
                    <ul>
                        ${priceProgressionList}
                    </ul>

                    <div class="advantage-total">
                        Totale tijdelijke korting: €${temporaryData.total.toFixed(2).replace('.', ',')}
                    </div>
                </div>

                ${bundleAdvantages.length > 0 ? `
                <div class="advantage-section combo-advantage">
                    <h4>Combokortingen</h4>
                    <ul>
                        ${bundleAdvantagesList}
                    </ul>

                    <div class="advantage-extra">
                        Permanente maandelijkse korting: <strong>€${(permanentData.total / 12).toFixed(2).replace('.', ',')}</strong>
                    </div>
                </div>
                ` : ''}
            `;
        } else if (hasPermanentDiscounts) {
            // Show only permanent discounts (combo advantages)
            body.innerHTML = `
                ${bundleAdvantages.length > 0 ? `
                <div class="advantage-section combo-advantage">
                    <h4>Combokortingen</h4>
                    <ul>
                        ${bundleAdvantagesList}
                    </ul>

                    <div class="advantage-extra">
                        Permanente maandelijkse korting: <strong>€${(permanentData.total / 12).toFixed(2).replace('.', ',')}</strong>
                    </div>
                </div>
                ` : ''}

                <p><em>Promo alleen geldig voor nieuwe klanten</em></p>
            `;
        }

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

    // Entertainment Box Recommendation methods
    shouldShowEntertainmentBoxRecommendation() {
        // Check if TV is not active AND Entertainment Box is not active AND user has streaming services
        const tvNotActive = !this.state.tv.enabled;
        const entertainmentBoxNotActive = !this.state.entertainmentBox.enabled;
        const hasStreamingServices = this.state.selectedEntertainmentServices.size > 0;

        return tvNotActive && entertainmentBoxNotActive && hasStreamingServices;
    }

    openEntertainmentBoxRecommendation() {
        const overlay = document.getElementById('entertainment-box-recommendation-overlay');
        if (overlay) {
            // Update the price in the recommendation based on current data
            const entertainmentBoxData = this.data.products.entertainmentBox;
            if (entertainmentBoxData) {
                const priceElement = overlay.querySelector('.price-amount');
                if (priceElement) {
                    let displayPrice = entertainmentBoxData.price;
                    if (entertainmentBoxData.discountValue) {
                        displayPrice = entertainmentBoxData.price - entertainmentBoxData.discountValue;
                    }
                    priceElement.textContent = `€${displayPrice.toFixed(2).replace('.', ',')}`;
                }
            }

            // Update the modal title based on selected streaming services
            const titleElement = overlay.querySelector('.sheet-title');
            if (titleElement) {
                const selectedServices = Array.from(this.state.selectedEntertainmentServices);
                let titleText = '';

                if (selectedServices.length === 1) {
                    // Single service: use the serviceName
                    const serviceName = this.getServiceDisplayName(selectedServices[0]);
                    titleText = `${serviceName} en al je lokale favorieten op één handige plek`;
                } else if (selectedServices.length >= 2 && selectedServices.length <= 3) {
                    // 2-3 services: list them separated by commas
                    const serviceNames = selectedServices.map(service => this.getServiceDisplayName(service));
                    titleText = `${serviceNames.join(', ')} en al je lokale favorieten op één handige plek`;
                } else if (selectedServices.length > 3) {
                    // More than 3 services: use generic text
                    titleText = `${this.data.modalTitles.multipleServices} en al je lokale favorieten op één handige plek`;
                } else {
                    // Fallback (shouldn't happen since this modal only shows when services are selected)
                    titleText = 'Netflix en al je lokale favorieten op één handige plek';
                }

                titleElement.textContent = titleText;
            }

            overlay.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        }
    }

    closeEntertainmentBoxRecommendation() {
        const overlay = document.getElementById('entertainment-box-recommendation-overlay');
        if (overlay) {
            overlay.style.display = 'none';
            document.body.style.overflow = '';
        }
    }

    addEntertainmentBoxAndContinue() {
        // Enable Entertainment Box
        this.state.entertainmentBox.enabled = true;
        const entertainmentBoxToggle = document.getElementById('entertainment-box-toggle');
        const entertainmentBoxContent = document.getElementById('entertainment-box-content');

        if (entertainmentBoxToggle) {
            entertainmentBoxToggle.checked = true;
        }
        if (entertainmentBoxContent) {
            entertainmentBoxContent.style.display = 'block';
            this.updateEntertainmentBoxStandaloneInfo();
            this.removeProductClosedState('entertainmentBox');
        }

        // Update UI states
        this.updateProductHeaderStates();
        this.updateCostSummary();

        // Close the recommendation sheet
        this.closeEntertainmentBoxRecommendation();

        // Continue to success page
        console.log('Order placed with Entertainment Box added!', this.state);
        window.location.href = 'success.html';
    }

    continueWithoutEntertainmentBox() {
        // Close the recommendation sheet
        this.closeEntertainmentBoxRecommendation();

        // Continue to success page without Entertainment Box
        console.log('Order placed without Entertainment Box!', this.state);
        window.location.href = 'success.html';
    }

    // Entertainment Box Deselection Confirmation methods
    shouldShowDeselectionConfirmation() {
        // Show confirmation if TV is enabled OR if user has streaming services selected
        const hasTv = this.state.tv.enabled;
        const hasStreamingServices = this.state.selectedEntertainmentServices.size > 0;

        return hasTv || hasStreamingServices;
    }

    openEntertainmentBoxDeselectionDialog() {
        const overlay = document.getElementById('entertainment-box-deselection-overlay');
        if (overlay) {
            overlay.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        }
    }

    closeEntertainmentBoxDeselectionDialog() {
        const overlay = document.getElementById('entertainment-box-deselection-overlay');
        if (overlay) {
            overlay.style.display = 'none';
            document.body.style.overflow = '';
        }
    }

    keepEntertainmentBox() {
        // Close the dialog and keep Entertainment Box selected
        this.closeEntertainmentBoxDeselectionDialog();
        // Ensure the toggle and checkbox remain checked
        const entertainmentBoxToggle = document.getElementById('entertainment-box-toggle');
        const tvCheckbox = document.getElementById('tv-entertainment-box-checkbox');

        if (entertainmentBoxToggle) {
            entertainmentBoxToggle.checked = true;
        }
        if (tvCheckbox && this.state.tv.enabled) {
            tvCheckbox.checked = true;
        }
    }

    removeEntertainmentBox() {
        // Close the dialog and proceed with deselecting Entertainment Box
        this.closeEntertainmentBoxDeselectionDialog();

        // Disable Entertainment Box
        this.state.entertainmentBox.enabled = false;
        const entertainmentBoxToggle = document.getElementById('entertainment-box-toggle');
        const entertainmentBoxContent = document.getElementById('entertainment-box-content');
        const tvCheckbox = document.getElementById('tv-entertainment-box-checkbox');
        const warningHighlight = document.getElementById('warning-highlight');

        if (entertainmentBoxToggle) {
            entertainmentBoxToggle.checked = false;
        }
        if (entertainmentBoxContent) {
            entertainmentBoxContent.style.display = 'none';
        }
        if (tvCheckbox && this.state.tv.enabled) {
            tvCheckbox.checked = false;
        }
        if (warningHighlight) {
            warningHighlight.style.display = 'block';
        }

        // Render closed state and update UI
        this.renderProductClosedState('entertainmentBox');
        this.updateProductHeaderStates();
        this.updateCostSummary();
    }

    // Streaming tier selection bottom sheet methods
    openStreamingTierSheet(serviceKey, isEditing = false) {
        this.currentStreamingService = serviceKey;
        this.isEditingStreamingService = isEditing;

        const serviceData = this.entertainmentData.entertainment[serviceKey];
        const overlay = document.getElementById('streaming-tier-sheet-overlay');
        const title = document.getElementById('tier-sheet-title');
        const icon = document.getElementById('tier-sheet-icon');
        const container = document.getElementById('tier-selection-container');
        const details = document.getElementById('tier-sheet-details');
        const pricing = document.getElementById('tier-sheet-pricing');
        const confirmBtn = document.getElementById('streaming-tier-confirm-btn');

        if (!overlay || !title || !icon || !container || !details || !pricing || !confirmBtn) return;

        // Set service name and icon
        title.textContent = this.getServiceDisplayName(serviceKey);
        icon.innerHTML = this.getServiceIcon(serviceKey);
        icon.className = `service-icon-large ${this.getServiceIconClass(serviceKey)}`;

        // Set current selected tier or default
        const currentTier = this.state[serviceKey].selectedTier || serviceData.defaultTier || 1;
        this.tempSelectedTier = currentTier;

        // Hide/show tier selection subtitle based on whether service has multiple tiers
        const subtitle = document.querySelector('.tier-selection-subtitle');
        if (subtitle) {
            if (!serviceData.tiers || serviceData.tiers.length <= 1) {
                subtitle.classList.add('hidden');
            } else {
                subtitle.classList.remove('hidden');
            }
        }

        // Render tier options or single option for services without tiers
        if (serviceData.tiers && serviceData.tiers.length > 0) {
            container.innerHTML = serviceData.tiers.map(tier => {
                const discountedPrice = this.getEntertainmentDiscountedPrice(tier.price);
                return `
                    <button class="tier-selection-option ${tier.id === currentTier ? 'active' : ''}" 
                            onclick="app.selectTempTier(${tier.id})">
                        <div class="tier-name">${tier.title}</div>
                        <div class="tier-price">€ ${discountedPrice.toFixed(2).replace('.', ',')}</div>
                    </button>
                `;
            }).join('');
        } else {
            // For services without tiers, show a single option
            const discountedPrice = this.getEntertainmentDiscountedPrice(serviceData.price);
            this.tempSelectedTier = 1; // Default tier for services without tiers
            container.innerHTML = `
                <button class="tier-selection-option active" onclick="app.selectTempTier(1)">
                    <div class="tier-name">${this.getServiceDisplayName(serviceKey)}</div>
                    <div class="tier-price ${priceClass}">${priceText}</div>
                </button>
            `;
        }

        // Update details and pricing for current tier
        this.updateTierSheetDetails();

        // Update button layout based on editing mode
        if (isEditing) {
            confirmBtn.style.display = 'none';

            // Add dual button layout for editing
            const footer = document.getElementById('streaming-tier-sheet').querySelector('.sheet-footer');
            const existingDualButtons = footer.querySelector('.dual-button-layout');
            if (!existingDualButtons) {
                const dualButtonHtml = `
                    <div class="dual-button-layout">
                        <button class="streaming-tier-remove-btn" onclick="app.removeStreamingServiceFromEdit()">Verwijderen</button>
                        <button class="streaming-tier-update-btn" onclick="app.confirmStreamingTierSelection()">Aanpassen</button>
                    </div>
                `;
                footer.insertAdjacentHTML('afterbegin', dualButtonHtml);
            }
        } else {
            confirmBtn.style.display = 'block';
            confirmBtn.textContent = 'Toevoegen';

            // Remove dual button layout if it exists
            const footer = document.getElementById('streaming-tier-sheet').querySelector('.sheet-footer');
            const existingDualButtons = footer.querySelector('.dual-button-layout');
            if (existingDualButtons) {
                existingDualButtons.remove();
            }
        }

        overlay.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }

    closeStreamingTierSheet() {
        const overlay = document.getElementById('streaming-tier-sheet-overlay');
        if (overlay) {
            overlay.style.display = 'none';
            document.body.style.overflow = '';
        }
        this.currentStreamingService = null;
        this.isEditingStreamingService = false;
        this.tempSelectedTier = null;
    }

    selectTempTier(tierId) {
        this.tempSelectedTier = tierId;

        // Update active state in UI
        const options = document.querySelectorAll('.tier-selection-option');
        options.forEach(option => {
            option.classList.remove('active');
        });

        const selectedOption = document.querySelector(`.tier-selection-option:nth-child(${tierId})`);
        if (selectedOption) {
            selectedOption.classList.add('active');
        }

        this.updateTierSheetDetails();
    }

    updateTierSheetDetails() {
        const serviceData = this.entertainmentData.entertainment[this.currentStreamingService];

        const details = document.getElementById('tier-sheet-details');
        const pricing = document.getElementById('tier-sheet-pricing');

        let summary, price, tier;

        if (serviceData.tiers && serviceData.tiers.length > 0) {
            // Service has tiers
            tier = serviceData.tiers.find(t => t.id === this.tempSelectedTier);
            if (!tier) return;
            summary = tier.summary;
            price = tier.price;
        } else {
            // Service without tiers
            summary = serviceData.summary;
            price = serviceData.price;
        }

        if (details) {
            const summaryItems = summary.split(', ').map(item => `<li>${item}</li>`).join('');
            details.innerHTML = `<ul>${summaryItems}</ul>`;
        }

        if (pricing) {
            // Check if this would be the Welcome Gift service
            const isWelcomeGift = this.state.welcomeGiftService === null;

            let pricingHtml;

            if (isWelcomeGift && ((tier && tier.welcomeGift) || (!tier && serviceData.welcomeGift))) {
                // Show Welcome Gift pricing with promo badge
                const welcomeGiftData = tier ? tier.welcomeGift : serviceData.welcomeGift;
                const originalPrice = price;
                const welcomePrice = welcomeGiftData.price;

                pricingHtml = `
                    <div class="tier-pricing">
                        <div class="original-price">€ ${originalPrice.toFixed(2).replace('.', ',')}</div>
                        <div class="welcome-gift-pricing">
                            <span class="welcome-gift-badge">Welkomstcadeau</span>
                            <div class="discount-price">€${welcomePrice.toFixed(2).replace('.', ',')}<span>/maand</span></div>
                        </div>
                        <div class="discount-info">gedurende ${welcomeGiftData.duration} maanden</div>
                    </div>
                `;
            } else {
                // Regular pricing
                const currentlyEnabled = this.getEnabledEntertainmentProductsCount();
                const isAddingSecondService = currentlyEnabled === 1 && !this.isEditingStreamingService;

                const discountedPrice = this.getEntertainmentDiscountedPrice(price, isAddingSecondService);
                const hasDiscount = discountedPrice < price;

                pricingHtml = `
                    <div class="price-display">€${discountedPrice.toFixed(2).replace('.', ',')}</div>
                    <div class="price-period">/maand</div>
                `;

                // Add discount tag if entertainment combo discount is applied
                if (hasDiscount) {
                    pricingHtml += `
                        <div class="tier-sheet-discount-tag" onclick="app.openComboDiscountSheet('entertainmentCombo')">
                            <span class="discount-tag-text">5% permanente korting toegepast</span>
                            <img src="final_assets/icons/i-icon-blue.svg" alt="info" class="info-icon">
                        </div>
                    `;
                }
            }

            pricing.innerHTML = pricingHtml;
        }
    }

    confirmStreamingTierSelection() {
        if (!this.currentStreamingService) return;

        const serviceKey = this.currentStreamingService;
        const serviceData = this.entertainmentData.entertainment[serviceKey];

        // Check if this is a new service (not editing)
        const isNewService = !this.state.selectedEntertainmentServices.has(serviceKey);

        // Add or update service
        this.state.selectedEntertainmentServices.add(serviceKey);
        this.state[serviceKey].enabled = true;

        // Set tier for services with tiers, or default tier for services without
        if (serviceData.tiers && serviceData.tiers.length > 0) {
            this.state[serviceKey].selectedTier = this.tempSelectedTier;
        } else {
            this.state[serviceKey].selectedTier = 1; // Default tier for services without tiers
        }

        // Assign Welcome Gift if this is a new service and no gift has been assigned
        if (isNewService) {
            this.assignWelcomeGift(serviceKey);
        }

        // Close the sheet
        this.closeStreamingTierSheet();

        // Update UI
        this.renderAvailableEntertainmentServices();
        this.renderSelectedEntertainmentServices();
        this.updateAllEntertainmentSubtitles();
        this.updateCostSummary();
    }

    editStreamingService(serviceKey) {
        this.openStreamingTierSheet(serviceKey, true);
    }

    removeStreamingServiceFromEdit() {
        if (!this.currentStreamingService) return;

        const serviceKey = this.currentStreamingService;

        // Handle Welcome Gift reassignment
        this.removeWelcomeGift(serviceKey);

        // Remove the service
        this.state.selectedEntertainmentServices.delete(serviceKey);
        this.state[serviceKey].enabled = false;

        // Close the sheet
        this.closeStreamingTierSheet();

        // Update UI
        this.renderAvailableEntertainmentServices();
        this.renderSelectedEntertainmentServices();
        this.updateAllEntertainmentSubtitles();
        this.updateCostSummary();
    }

    // Combo discount bottomsheet methods
    openComboDiscountSheet(discountType) {
        if (!this.discountsData) return;

        const overlay = document.getElementById('combo-discount-sheet-overlay');
        const title = document.getElementById('combo-discount-sheet-title');
        const body = document.getElementById('combo-discount-sheet-body');

        if (!overlay || !title || !body) return;

        const discountData = this.discountsData[discountType];
        if (!discountData) return;

        let dynamicTitle = discountData.title;
        let dynamicContent = discountData.content;

        // Handle dynamic content for permanent discount
        if (discountType === 'permanentDiscount') {
            // Find the first mobile simcard with permanent discount to get pricing info
            let originalPrice = 0;
            let discountedPrice = 0;
            let productName = '';
            let discountName = '';
            let hasTemporaryDiscount = false;

            if (this.state.mobile.enabled && this.state.internet.enabled) {
                const firstSimcard = this.state.mobile.simcards[0];
                if (firstSimcard) {
                    const mobileTier = this.data.products.mobile.tiers.find(t => t.id === firstSimcard.selectedTier);
                    const permanentDiscount = this.data.discounts.permanent;

                    if (mobileTier && permanentDiscount.enabled && permanentDiscount.conditions.applicableToTiers.includes(mobileTier.id)) {
                        originalPrice = mobileTier.price;
                        const permanentDiscountAmount = mobileTier.price * (permanentDiscount.percentage / 100);
                        discountedPrice = mobileTier.price - permanentDiscountAmount;
                        productName = mobileTier.title.toLowerCase();
                        discountName = `${permanentDiscount.percentage}% permanente korting`;
                        const discountCalc = this.calculateMobileDiscount(mobileTier, 0);
                        hasTemporaryDiscount = discountCalc.temporaryDiscountAmount > 0;
                    }
                }
            }

            // Replace placeholders in title
            dynamicTitle = dynamicTitle
                .replace('##DISCOUNT_NAME##', discountName)
                .replace('##PRODUCT_NAME##', productName);

            // Replace placeholders in content
            const discountValue = originalPrice - discountedPrice;
            dynamicContent = dynamicContent
                .replace('##ORIGINAL_PRICE##', originalPrice.toFixed(2).replace('.', ','))
                .replace('##DISCOUNT_VALUE##', discountValue.toFixed(2).replace('.', ','));

            // Add temporary discount highlight if applicable
            const temporaryHighlight = hasTemporaryDiscount ?
                "<div class='temporary-discount-highlight'><p>Daarbovenop geniet je van een tijdelijke extra korting dankzij de lopende promotie.</p></div>" : '';

            dynamicContent = dynamicContent.replace('##TEMPORARY_DISCOUNT_HIGHLIGHT##', temporaryHighlight);
        }

        title.textContent = dynamicTitle;
        body.innerHTML = dynamicContent;

        overlay.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    }

    closeComboDiscountSheet() {
        const overlay = document.getElementById('combo-discount-sheet-overlay');
        if (overlay) {
            overlay.style.display = 'none';
            document.body.style.overflow = '';
        }
    }

    handleStreamingMethodSelection(method) {
        if (method === 'hub') {
            // Enable Entertainment Box when hub is selected
            if (!this.state.entertainmentBox.enabled) {
                this.state.entertainmentBox.enabled = true;
                const entertainmentBoxToggle = document.getElementById('entertainment-box-toggle');
                const entertainmentBoxContent = document.getElementById('entertainment-box-content');

                if (entertainmentBoxToggle) {
                    entertainmentBoxToggle.checked = true;
                }
                if (entertainmentBoxContent) {
                    entertainmentBoxContent.style.display = 'block';
                    this.updateEntertainmentBoxStandaloneInfo();
                    this.removeProductClosedState('entertainmentBox');
                }

                this.updateProductHeaderStates();
                this.updateCostSummary();
            }
        } else if (method === 'separate') {
            // Disable Entertainment Box when separate apps is selected (only if TV is not enabled)
            if (!this.state.tv.enabled && this.state.entertainmentBox.enabled) {
                this.state.entertainmentBox.enabled = false;
                const entertainmentBoxToggle = document.getElementById('entertainment-box-toggle');
                const entertainmentBoxContent = document.getElementById('entertainment-box-content');

                if (entertainmentBoxToggle) {
                    entertainmentBoxToggle.checked = false;
                }
                if (entertainmentBoxContent) {
                    entertainmentBoxContent.style.display = 'none';
                }

                this.renderProductClosedState('entertainmentBox');
                this.updateProductHeaderStates();
                this.updateCostSummary();
            }
        }
    }

    updateEntertainmentHubSelectionVisibility() {
        const selectionSection = document.getElementById('entertainment-hub-selection-section');
        if (!selectionSection) return;

        const tvEnabled = this.state.tv.enabled;
        const entertainmentEnabled = this.state.entertainment.enabled;

        // Show the selection section when TV is not activated and entertainment is activated
        if (!tvEnabled && entertainmentEnabled) {
            selectionSection.style.display = 'block';
        } else {
            selectionSection.style.display = 'none';
        }
    }

    updateTvBundleHighlight() {
        const highlightBlock = document.getElementById('tv-bundle-highlight');
        if (!highlightBlock) return;

        const tvEnabled = this.state.tv.enabled;

        // Show the highlight when TV card is activated, hide when deactivated
        if (tvEnabled) {
            highlightBlock.style.display = 'block';
        } else {
            highlightBlock.style.display = 'none';
        }
    }
}

// Initialize the app
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new UnifiedConfigurator();
});