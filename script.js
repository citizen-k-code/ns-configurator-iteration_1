// Application state
const app = {
    data: null,
    selectedProducts: {
        internet: { enabled: false, tier: null },
        mobile: { enabled: false, simcards: [] },
        tv: { enabled: false },
        entertainment: { enabled: false, services: [] },
        entertainmentBox: { enabled: false },
        fixedPhone: { enabled: false }
    },
    init() {
        this.loadData();
        this.setupEventListeners();
        this.parseURLParams();
        this.updateUI();
        this.updateCostSummary();
    },

    async loadData() {
        try {
            const response = await fetch('data.json');
            this.data = await response.json();
        } catch (error) {
            console.error('Error loading data:', error);
        }
    },

    setupEventListeners() {
        // Product toggles
        document.getElementById('internet-toggle').addEventListener('change', (e) => {
            this.toggleProduct('internet', e.target.checked);
        });

        document.getElementById('mobile-toggle').addEventListener('change', (e) => {
            this.toggleProduct('mobile', e.target.checked);
        });

        document.getElementById('tv-toggle').addEventListener('change', (e) => {
            this.toggleProduct('tv', e.target.checked);
        });

        document.getElementById('entertainment-toggle').addEventListener('change', (e) => {
            this.toggleProduct('entertainment', e.target.checked);
        });

        document.getElementById('entertainment-box-toggle').addEventListener('change', (e) => {
            this.toggleProduct('entertainmentBox', e.target.checked);
        });

        document.getElementById('fixed-phone-toggle').addEventListener('change', (e) => {
            this.toggleProduct('fixedPhone', e.target.checked);
        });

        // Add simcard button
        const addSimcardBtn = document.getElementById('add-simcard-btn');
        if (addSimcardBtn) {
            addSimcardBtn.addEventListener('click', () => {
                this.addSimcard();
            });
        }
    },

    parseURLParams() {
        const urlParams = new URLSearchParams(window.location.search);

        if (urlParams.has('internet')) {
            const tierIndex = parseInt(urlParams.get('internet')) - 1;
            this.selectedProducts.internet.enabled = true;
            this.selectedProducts.internet.tier = tierIndex;
            document.getElementById('internet-toggle').checked = true;
        }

        if (urlParams.has('mobile')) {
            const tierIndex = parseInt(urlParams.get('mobile')) - 1;
            this.selectedProducts.mobile.enabled = true;
            this.selectedProducts.mobile.simcards = [{
                tier: tierIndex,
                name: 'Simkaart 1'
            }];
            document.getElementById('mobile-toggle').checked = true;
        }

        if (urlParams.has('tv')) {
            this.selectedProducts.tv.enabled = true;
            document.getElementById('tv-toggle').checked = true;
        }
    },

    toggleProduct(productType, enabled) {
        this.selectedProducts[productType].enabled = enabled;

        if (productType === 'mobile' && enabled && this.selectedProducts.mobile.simcards.length === 0) {
            this.selectedProducts.mobile.simcards = [{
                tier: 0,
                name: 'Simkaart 1'
            }];
        }

        this.updateUI();
        this.updateCostSummary();
    },

    updateUI() {
        this.updateInternetUI();
        this.updateMobileUI();
        this.updateTVUI();
        this.updateEntertainmentUI();
        this.updateEntertainmentBoxUI();
        this.updateFixedPhoneUI();
        this.updateProductCardStates();
    },

    updateInternetUI() {
        const content = document.getElementById('internet-content');
        const isEnabled = this.selectedProducts.internet.enabled;

        content.style.display = isEnabled ? 'block' : 'none';

        if (isEnabled && this.data) {
            this.renderInternetTiers();
            this.renderInternetInfo();
        }
    },

    renderInternetTiers() {
        const tiersContainer = document.getElementById('internet-tiers');
        if (!tiersContainer || !this.data.internet) return;

        const tiers = this.data.internet.tiers;
        tiersContainer.innerHTML = tiers.map((tier, index) => `
            <div class="tier-option ${this.selectedProducts.internet.tier === index ? 'active' : ''}" 
                 onclick="app.selectInternetTier(${index})">
                <div class="tier-title">${tier.name}</div>
                <div class="tier-subtitle">${tier.speed}</div>
            </div>
        `).join('');
    },

    selectInternetTier(tierIndex) {
        this.selectedProducts.internet.tier = tierIndex;
        this.renderInternetTiers();
        this.renderInternetInfo();
        this.updateCostSummary();
    },

    renderInternetInfo() {
        const infoContainer = document.getElementById('internet-info');
        if (!infoContainer || !this.data.internet) return;

        const selectedTier = this.selectedProducts.internet.tier;
        if (selectedTier === null) return;

        const tier = this.data.internet.tiers[selectedTier];
        infoContainer.innerHTML = `
            <ul class="tier-details">
                ${tier.features.map(feature => `<li>${feature}</li>`).join('')}
            </ul>
            <div class="price-info">
                <div class="price-with-badge">
                    <div class="price-content">
                        <div class="price-amount">€ ${tier.price}</div>
                        <div class="price-period">per maand</div>
                    </div>
                </div>
            </div>
        `;
    },

    updateMobileUI() {
        const content = document.getElementById('mobile-content');
        const isEnabled = this.selectedProducts.mobile.enabled;

        content.style.display = isEnabled ? 'block' : 'none';

        if (isEnabled && this.data) {
            this.renderSimcards();
            this.updateAddSimcardButton();
        }
    },

    renderSimcards() {
        const container = document.getElementById('simcards-container');
        if (!container || !this.data.mobile) return;

        container.innerHTML = this.selectedProducts.mobile.simcards.map((simcard, index) => `
            <div class="simcard" data-index="${index}">
                <div class="simcard-header">
                    <span class="simcard-title">${simcard.name}</span>
                    ${this.selectedProducts.mobile.simcards.length > 1 ? 
                        `<button class="remove-simcard-btn" onclick="app.removeSimcard(${index})">×</button>` : ''}
                </div>
                <div class="tier-selector">
                    ${this.data.mobile.tiers.map((tier, tierIndex) => `
                        <div class="tier-option ${simcard.tier === tierIndex ? 'active' : ''}" 
                             onclick="app.selectMobileTier(${index}, ${tierIndex})">
                            <div class="tier-title">${tier.name}</div>
                            <div class="tier-subtitle">${tier.data}</div>
                        </div>
                    `).join('')}
                </div>
                <div class="tier-info">
                    ${this.renderMobileTierInfo(simcard.tier)}
                </div>
            </div>
        `).join('');
    },

    renderMobileTierInfo(tierIndex) {
        if (!this.data.mobile || tierIndex === null) return '';

        const tier = this.data.mobile.tiers[tierIndex];
        return `
            <ul class="tier-details">
                ${tier.features.map(feature => `<li>${feature}</li>`).join('')}
            </ul>
            <div class="price-info">
                <div class="price-with-badge">
                    <div class="price-content">
                        <div class="price-amount">€ ${tier.price}</div>
                        <div class="price-period">per maand</div>
                    </div>
                </div>
            </div>
        `;
    },

    selectMobileTier(simcardIndex, tierIndex) {
        this.selectedProducts.mobile.simcards[simcardIndex].tier = tierIndex;
        this.renderSimcards();
        this.updateCostSummary();
    },

    addSimcard() {
        if (this.selectedProducts.mobile.simcards.length < 5) {
            const newIndex = this.selectedProducts.mobile.simcards.length + 1;
            this.selectedProducts.mobile.simcards.push({
                tier: 0,
                name: `Simkaart ${newIndex}`
            });
            this.renderSimcards();
            this.updateAddSimcardButton();
            this.updateCostSummary();
        }
    },

    removeSimcard(index) {
        this.selectedProducts.mobile.simcards.splice(index, 1);
        // Rename remaining simcards
        this.selectedProducts.mobile.simcards.forEach((simcard, i) => {
            simcard.name = `Simkaart ${i + 1}`;
        });
        this.renderSimcards();
        this.updateAddSimcardButton();
        this.updateCostSummary();
    },

    updateAddSimcardButton() {
        const btn = document.getElementById('add-simcard-btn');
        if (!btn) return;

        const count = this.selectedProducts.mobile.simcards.length;
        if (count >= 5) {
            btn.style.display = 'none';
        } else {
            btn.style.display = 'block';
            btn.textContent = `➕ Voeg ${count + 1}e simkaart toe`;
        }
    },

    updateTVUI() {
        const content = document.getElementById('tv-content');
        const isEnabled = this.selectedProducts.tv.enabled;

        content.style.display = isEnabled ? 'block' : 'none';

        if (isEnabled && this.data) {
            this.renderTVInfo();
        }
    },

    renderTVInfo() {
        const infoContainer = document.getElementById('tv-info');
        if (!infoContainer || !this.data.tv) return;

        const tvData = this.data.tv;
        infoContainer.innerHTML = `
            <ul class="tier-details">
                ${tvData.features.map(feature => `<li>${feature}</li>`).join('')}
            </ul>
            <div class="price-info">
                <div class="price-with-badge">
                    <div class="price-content">
                        <div class="price-amount">€ ${tvData.price}</div>
                        <div class="price-period">per maand</div>
                    </div>
                </div>
            </div>
        `;
    },

    updateEntertainmentUI() {
        const content = document.getElementById('entertainment-content');
        const isEnabled = this.selectedProducts.entertainment.enabled;

        content.style.display = isEnabled ? 'block' : 'none';

        if (isEnabled && this.data) {
            this.renderAvailableEntertainmentServices();
            this.renderSelectedEntertainmentServices();
        }
    },

    renderAvailableEntertainmentServices() {
        const container = document.getElementById('available-services-grid');
        if (!container || !this.data.entertainment) return;

        const availableServices = this.data.entertainment.services.filter(service => 
            !this.selectedProducts.entertainment.services.find(selected => selected.id === service.id)
        );

        container.innerHTML = availableServices.map(service => `
            <div class="available-service" onclick="app.addEntertainmentService('${service.id}')">
                <div class="service-icon ${service.id}-icon">${service.icon}</div>
                <div class="available-service-content">
                    <div class="available-service-name">${service.name}</div>
                    <div class="available-service-price">Vanaf € ${service.tiers[0].price}/maand</div>
                </div>
                <div class="add-service-icon">+</div>
            </div>
        `).join('');
    },

    renderSelectedEntertainmentServices() {
        const container = document.getElementById('selected-entertainment-services');
        if (!container) return;

        const selectedServices = this.selectedProducts.entertainment.services;

        // Show/hide combo discount banner
        const banner = document.getElementById('combo-discount-banner');
        if (banner) {
            banner.style.display = selectedServices.length >= 2 ? 'block' : 'none';
        }

        // Render selected services
        const servicesHTML = selectedServices.map(selectedService => {
            const serviceData = this.data.entertainment.services.find(s => s.id === selectedService.id);
            if (!serviceData) return '';

            return `
                <div class="selected-service">
                    <div class="selected-service-header">
                        <div class="selected-service-title">
                            <div class="service-icon ${serviceData.id}-icon">${serviceData.icon}</div>
                            ${serviceData.name}
                        </div>
                        <button class="remove-service" onclick="app.removeEntertainmentService('${selectedService.id}')">×</button>
                    </div>
                    <div class="service-tier-selector">
                        ${serviceData.tiers.map((tier, index) => `
                            <div class="service-tier-option ${selectedService.tier === index ? 'active' : ''}" 
                                 onclick="app.selectEntertainmentTier('${selectedService.id}', ${index})">
                                <div class="tier-title">${tier.name}</div>
                                <div class="tier-subtitle">${tier.description}</div>
                            </div>
                        `).join('')}
                    </div>
                    <div class="service-details">
                        <ul>
                            ${serviceData.tiers[selectedService.tier].features.map(feature => `<li>${feature}</li>`).join('')}
                        </ul>
                    </div>
                    <div class="service-price">€ ${serviceData.tiers[selectedService.tier].price}/maand</div>
                </div>
            `;
        }).join('');

        container.querySelector('.selected-entertainment-services').innerHTML = servicesHTML;
    },

    addEntertainmentService(serviceId) {
        this.selectedProducts.entertainment.services.push({
            id: serviceId,
            tier: 0
        });
        this.renderAvailableEntertainmentServices();
        this.renderSelectedEntertainmentServices();
        this.updateCostSummary();
    },

    removeEntertainmentService(serviceId) {
        this.selectedProducts.entertainment.services = this.selectedProducts.entertainment.services.filter(
            service => service.id !== serviceId
        );
        this.renderAvailableEntertainmentServices();
        this.renderSelectedEntertainmentServices();
        this.updateCostSummary();
    },

    selectEntertainmentTier(serviceId, tierIndex) {
        const service = this.selectedProducts.entertainment.services.find(s => s.id === serviceId);
        if (service) {
            service.tier = tierIndex;
            this.renderSelectedEntertainmentServices();
            this.updateCostSummary();
        }
    },

    updateEntertainmentBoxUI() {
        const content = document.getElementById('entertainment-box-content');
        const isEnabled = this.selectedProducts.entertainmentBox.enabled;

        content.style.display = isEnabled ? 'block' : 'none';

        if (isEnabled && this.data) {
            this.renderEntertainmentBoxInfo();
        }
    },

    renderEntertainmentBoxInfo() {
        const infoContainer = document.getElementById('entertainment-box-info');
        if (!infoContainer || !this.data.entertainmentBox) return;

        const boxData = this.data.entertainmentBox;
        infoContainer.innerHTML = `
            <ul class="tier-details">
                ${boxData.features.map(feature => `<li>${feature}</li>`).join('')}
            </ul>
            <div class="price-info">
                <div class="price-with-badge">
                    <div class="price-content">
                        <div class="price-amount">€ ${boxData.price}</div>
                        <div class="price-period">per maand</div>
                    </div>
                </div>
            </div>
        `;
    },

    updateFixedPhoneUI() {
        const content = document.getElementById('fixed-phone-content');
        const isEnabled = this.selectedProducts.fixedPhone.enabled;

        content.style.display = isEnabled ? 'block' : 'none';

        if (isEnabled && this.data) {
            this.renderFixedPhoneInfo();
        }
    },

    renderFixedPhoneInfo() {
        const infoContainer = document.getElementById('fixed-phone-info');
        if (!infoContainer || !this.data.fixedPhone) return;

        const phoneData = this.data.fixedPhone;
        infoContainer.innerHTML = `
            <ul class="tier-details">
                ${phoneData.features.map(feature => `<li>${feature}</li>`).join('')}
            </ul>
            <div class="price-info">
                <div class="price-with-badge">
                    <div class="price-content">
                        <div class="price-amount">€ ${phoneData.price}</div>
                        <div class="price-period">per maand</div>
                    </div>
                </div>
            </div>
        `;
    },

    updateProductCardStates() {
        // Update closed state styling for each product
        this.updateProductClosedState('internet');
        this.updateProductClosedState('mobile');
        this.updateProductClosedState('tv');
        this.updateProductClosedState('entertainment');
        this.updateProductClosedState('entertainment-box');
        this.updateProductClosedState('fixed-phone');
    },

    updateProductClosedState(productType) {
        const productMap = {
            'internet': 'internet',
            'mobile': 'mobile', 
            'tv': 'tv',
            'entertainment': 'entertainment',
            'entertainment-box': 'entertainmentBox',
            'fixed-phone': 'fixedPhone'
        };

        const productKey = productMap[productType];
        const isEnabled = this.selectedProducts[productKey].enabled;
        const block = document.getElementById(`${productType}-block`);

        if (!block) return;

        // Check if product has closed state content
        const closedStateElement = block.querySelector('.product-closed-state');
        if (closedStateElement) {
            closedStateElement.style.display = isEnabled ? 'none' : 'block';
        }

        // Add/remove styling based on state
        if (isEnabled) {
            block.classList.add('product-enabled');
            block.classList.remove('product-disabled');
        } else {
            block.classList.add('product-disabled');
            block.classList.remove('product-enabled');

            // Render closed state content if needed
            this.renderClosedStateContent(productType);
        }
    },

    renderClosedStateContent(productType) {
        if (!this.data) return;

        const block = document.getElementById(`${productType}-block`);
        if (!block) return;

        // Check if we need to create closed state content
        let closedState = block.querySelector('.product-closed-state');
        if (!closedState && this.data.closedStates && this.data.closedStates[productType]) {
            const productContent = block.querySelector('.product-content');
            if (productContent) {
                const closedData = this.data.closedStates[productType];

                closedState = document.createElement('div');
                closedState.className = 'product-closed-state';
                closedState.innerHTML = `
                    <div class="product-closed-content">
                        <div class="product-closed-divider"></div>
                        <div class="product-closed-summary">${this.replaceVariables(closedData.summary)}</div>
                        ${closedData.highlight ? `
                            <div class="product-closed-highlight">
                                <div class="closed-highlight-title">${closedData.highlight.title}</div>
                                <div class="closed-highlight-description">${closedData.highlight.description}</div>
                            </div>
                        ` : ''}
                    </div>
                `;

                // Insert after product header
                const productHeader = block.querySelector('.product-header');
                if (productHeader) {
                    productHeader.insertAdjacentElement('afterend', closedState);
                }
            }
        }
    },

    replaceVariables(text) {
        if (!text) return '';

        // Replace ##PRICE## with appropriate price
        return text.replace(/##PRICE##/g, () => {
            // This would need to be implemented based on specific product pricing logic
            return '25,00';
        });
    },

    updateCostSummary() {
        let totalCost = 0;
        let totalOriginalCost = 0;
        const breakdown = [];

        // Internet
        if (this.selectedProducts.internet.enabled && this.selectedProducts.internet.tier !== null) {
            const tier = this.data.internet.tiers[this.selectedProducts.internet.tier];
            totalCost += parseFloat(tier.price);
            totalOriginalCost += parseFloat(tier.originalPrice || tier.price);
            breakdown.push({
                name: `Internet ${tier.name}`,
                price: tier.price,
                originalPrice: tier.originalPrice
            });
        }

        // Mobile
        if (this.selectedProducts.mobile.enabled) {
            this.selectedProducts.mobile.simcards.forEach((simcard, index) => {
                if (simcard.tier !== null) {
                    const tier = this.data.mobile.tiers[simcard.tier];
                    totalCost += parseFloat(tier.price);
                    totalOriginalCost += parseFloat(tier.originalPrice || tier.price);
                    breakdown.push({
                        name: `${simcard.name} ${tier.name}`,
                        price: tier.price,
                        originalPrice: tier.originalPrice
                    });
                }
            });
        }

        // TV
        if (this.selectedProducts.tv.enabled) {
            totalCost += parseFloat(this.data.tv.price);
            totalOriginalCost += parseFloat(this.data.tv.originalPrice || this.data.tv.price);
            breakdown.push({
                name: 'TV',
                price: this.data.tv.price,
                originalPrice: this.data.tv.originalPrice
            });
        }

        // Entertainment
        if (this.selectedProducts.entertainment.enabled) {
            this.selectedProducts.entertainment.services.forEach(service => {
                const serviceData = this.data.entertainment.services.find(s => s.id === service.id);
                if (serviceData) {
                    const tier = serviceData.tiers[service.tier];
                    totalCost += parseFloat(tier.price);
                    totalOriginalCost += parseFloat(tier.originalPrice || tier.price);
                    breakdown.push({
                        name: `${serviceData.name} ${tier.name}`,
                        price: tier.price,
                        originalPrice: tier.originalPrice
                    });
                }
            });
        }

        // Entertainment Box
        if (this.selectedProducts.entertainmentBox.enabled) {
            totalCost += parseFloat(this.data.entertainmentBox.price);
            totalOriginalCost += parseFloat(this.data.entertainmentBox.originalPrice || this.data.entertainmentBox.price);
            breakdown.push({
                name: 'Entertainment Box',
                price: this.data.entertainmentBox.price,
                originalPrice: this.data.entertainmentBox.originalPrice
            });
        }

        // Fixed Phone
        if (this.selectedProducts.fixedPhone.enabled) {
            totalCost += parseFloat(this.data.fixedPhone.price);
            totalOriginalCost += parseFloat(this.data.fixedPhone.originalPrice || this.data.fixedPhone.price);
            breakdown.push({
                name: 'Vaste lijn',
                price: this.data.fixedPhone.price,
                originalPrice: this.data.fixedPhone.originalPrice
            });
        }

        // Update UI
        document.getElementById('monthly-total').textContent = totalCost.toFixed(2);
        document.getElementById('mobile-monthly-total').textContent = totalCost.toFixed(2);

        // Show/hide strikethrough prices
        const hasDiscount = totalOriginalCost > totalCost;
        const strikethroughElement = document.getElementById('strikethrough-cost');
        const mobileStrikethroughElement = document.getElementById('mobile-strikethrough');

        if (hasDiscount) {
            if (strikethroughElement) {
                strikethroughElement.textContent = `€ ${totalOriginalCost.toFixed(2)}`;
                strikethroughElement.style.display = 'block';
            }
            if (mobileStrikethroughElement) {
                mobileStrikethroughElement.textContent = `€ ${totalOriginalCost.toFixed(2)}`;
                mobileStrikethroughElement.style.display = 'block';
            }

            const advantage = totalOriginalCost - totalCost;
            document.getElementById('advantage-amount').textContent = advantage.toFixed(2);
            document.getElementById('mobile-advantage-amount').textContent = advantage.toFixed(2);
            document.getElementById('advantage-block').style.display = 'block';
            document.getElementById('mobile-advantage').style.display = 'block';
        } else {
            if (strikethroughElement) strikethroughElement.style.display = 'none';
            if (mobileStrikethroughElement) mobileStrikethroughElement.style.display = 'none';
            document.getElementById('advantage-block').style.display = 'none';
            document.getElementById('mobile-advantage').style.display = 'none';
        }

        // Update product overview
        this.updateProductOverview(breakdown);
    },

    updateProductOverview(breakdown) {
        const container = document.getElementById('product-overview-content');
        if (!container) return;

        container.innerHTML = breakdown.map(item => `
            <div class="overview-item">
                <span class="overview-name">${item.name}</span>
                <span class="overview-price">€ ${item.price}</span>
            </div>
        `).join('');
    },

    toggleProductOverview() {
        const content = document.getElementById('product-overview-content');
        const arrow = document.getElementById('toggle-arrow');

        if (content.style.display === 'none' || !content.style.display) {
            content.style.display = 'block';
            arrow.textContent = '▲';
        } else {
            content.style.display = 'none';
            arrow.textContent = '▼';
        }
    },

    scrollToEntertainmentBox() {
        const entertainmentBoxBlock = document.getElementById('entertainment-box-block');
        if (entertainmentBoxBlock) {
            entertainmentBoxBlock.scrollIntoView({ behavior: 'smooth' });
        }
    },

    scrollToMainSummary() {
        const part2 = document.getElementById('part2');
        if (part2) {
            part2.scrollIntoView({ behavior: 'smooth' });
        }
    },

    handleOrderButton() {
        // Handle main order button click
        console.log('Order button clicked');
    },

    handleMobileOrderButton() {
        // Handle mobile order button click
        console.log('Mobile order button clicked');
    },

    openTooltipSheet(type) {
        const overlay = document.getElementById('sheet-overlay');
        const title = document.getElementById('sheet-title');
        const body = document.getElementById('sheet-body');

        if (!overlay || !title || !body) return;

        // Set content based on type
        const tooltipContent = this.getTooltipContent(type);
        title.textContent = tooltipContent.title;
        body.innerHTML = tooltipContent.body;

        overlay.style.display = 'flex';
        document.body.style.overflow = 'hidden';
    },

    closeTooltipSheet() {
        const overlay = document.getElementById('sheet-overlay');
        if (overlay) {
            overlay.style.display = 'none';
            document.body.style.overflow = '';
        }
    },

    openEntertainmentBottomSheet() {
        const overlay = document.getElementById('entertainment-sheet-overlay');
        if (overlay) {
            overlay.style.display = 'flex';
            document.body.style.overflow = 'hidden';
        }
    },

    closeEntertainmentBottomSheet() {
        const overlay = document.getElementById('entertainment-sheet-overlay');
        if (overlay) {
            overlay.style.display = 'none';
            document.body.style.overflow = '';
        }
    },

    getTooltipContent(type) {
        const content = {
            internet: {
                title: 'Welke snelheid heb ik nodig?',
                body: '<p>De juiste internetsnelheid hangt af van hoe je internet gebruikt...</p>'
            },
            mobile: {
                title: 'Hoeveel mobiele data heb ik nodig?',
                body: '<p>Je datagebruik hangt af van hoe je je smartphone gebruikt...</p>'
            },
            tv_main: {
                title: 'TV-pakket informatie',
                body: '<p>Ons TV-pakket biedt toegang tot alle populaire zenders...</p>'
            },
            permanent_promotion: {
                title: 'Permanente promotie',
                body: '<p>Deze korting geldt permanent voor de duur van je contract...</p>'
            },
            temporary_promotion: {
                title: 'Tijdelijke promoties',
                body: '<p>Deze kortingen gelden voor een beperkte periode...</p>'
            }
        };

        return content[type] || { title: 'Informatie', body: '<p>Geen informatie beschikbaar.</p>' };
    }
};

// Initialize the app when DOM is loaded
document.addEventListener('DOMContentLoaded', () => {
    try {
        app.init();
    } catch (error) {
        console.error('Error initializing configurator:', error);
    }
});