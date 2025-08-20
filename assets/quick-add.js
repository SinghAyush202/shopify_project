import { morph } from '@theme/morph';
import { Component } from '@theme/component';
import { CartUpdateEvent, ThemeEvents } from '@theme/events';
import { DialogComponent, DialogCloseEvent } from '@theme/dialog';
import { mediaQueryLarge, isMobileBreakpoint, getIOSVersion } from '@theme/utilities';

export class QuickAddComponent extends Component {
  /** @type {AbortController | null} */
  #abortController = null;
  /** @type {Map<string, Element>} */
  #cachedContent = new Map();

  get productPageUrl() {
    const productCard = /** @type {import('./product-card').ProductCard | null} */ (this.closest('product-card'));
    const productLink = productCard?.getProductCardLink();

    if (!productLink?.href) return '';

    const url = new URL(productLink.href);

    if (url.searchParams.has('variant')) {
      return url.toString();
    }

    const selectedVariantId = this.#getSelectedVariantId();
    if (selectedVariantId) {
      url.searchParams.set('variant', selectedVariantId);
    }

    return url.toString();
  }

  /**
   * Gets the currently selected variant ID from the product card
   * @returns {string | null} The variant ID or null
   */
  #getSelectedVariantId() {
    const productCard = /** @type {import('./product-card').ProductCard | null} */ (this.closest('product-card'));
    return productCard?.getSelectedVariantId() || null;
  }

  connectedCallback() {
    super.connectedCallback();

    mediaQueryLarge.addEventListener('change', this.#closeQuickAddModal);
  }

  disconnectedCallback() {
    super.disconnectedCallback();

    mediaQueryLarge.removeEventListener('change', this.#closeQuickAddModal);
    this.#abortController?.abort();
  }

  /**
   * Handles quick add button click (the "+" button)
   * @param {Event} event - The click event
   */
  handleClick = async (event) => {
    event.preventDefault();

    console.log('Quick add button clicked'); // Debug log

    const currentUrl = this.productPageUrl;
    console.log('Product URL:', currentUrl); // Debug log

    // Check if we have cached content for this URL
    let productGrid = this.#cachedContent.get(currentUrl);

    if (!productGrid) {
      console.log('Fetching product page content...'); // Debug log
      // Fetch and cache the content
      const html = await this.fetchProductPage(currentUrl);
      if (html) {
        const gridElement = html.querySelector('[data-product-grid-content]');
        if (gridElement) {
          // Cache the cloned element to avoid modifying the original
          productGrid = /** @type {Element} */ (gridElement.cloneNode(true));
          this.#cachedContent.set(currentUrl, productGrid);
          console.log('Product content cached'); // Debug log
        } else {
          console.log('No product grid element found'); // Debug log
        }
      }
    } else {
      console.log('Using cached product content'); // Debug log
    }

    if (productGrid) {
      // Use a fresh clone from the cache
      const freshContent = /** @type {Element} */ (productGrid.cloneNode(true));
      await this.updateQuickAddModal(freshContent);
    }

    this.#openQuickAddModal();
  };

  /** @param {QuickAddDialog} dialogComponent */
  #stayVisibleUntilDialogCloses(dialogComponent) {
    this.toggleAttribute('stay-visible', true);

    dialogComponent.addEventListener(DialogCloseEvent.eventName, () => this.toggleAttribute('stay-visible', false), {
      once: true,
    });
  }

  #openQuickAddModal = () => {
    const dialogComponent = document.getElementById('quick-add-dialog');
    if (!(dialogComponent instanceof QuickAddDialog)) return;

    this.#stayVisibleUntilDialogCloses(dialogComponent);

    dialogComponent.showDialog();
    console.log('Quick add modal opened'); // Debug log
  };

  #closeQuickAddModal = () => {
    const dialogComponent = document.getElementById('quick-add-dialog');
    if (!(dialogComponent instanceof QuickAddDialog)) return;

    dialogComponent.closeDialog();
  };

  /**
   * Fetches the product page content
   * @param {string} productPageUrl - The URL of the product page to fetch
   * @returns {Promise<Document | null>}
   */
  async fetchProductPage(productPageUrl) {
    if (!productPageUrl) return null;

    // We use this to abort the previous fetch request if it's still pending.
    this.#abortController?.abort();
    this.#abortController = new AbortController();

    try {
      const response = await fetch(productPageUrl, {
        signal: this.#abortController.signal,
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch product page: HTTP error ${response.status}`);
      }

      const responseText = await response.text();
      const html = new DOMParser().parseFromString(responseText, 'text/html');

      return html;
    } catch (error) {
      if (error.name === 'AbortError') {
        return null;
      } else {
        console.error('Error fetching product page:', error);
        throw error;
      }
    } finally {
      this.#abortController = null;
    }
  }

  /**
   * Re-renders the variant picker and includes product description.
   * @param {Element} productGrid - The product grid element
   */
  async updateQuickAddModal(productGrid) {
    const modalContent = document.getElementById('quick-add-modal-content');

    if (!productGrid || !modalContent) {
      console.log('Missing productGrid or modalContent'); // Debug log
      return;
    }

    console.log('Updating quick add modal...'); // Debug log

    // Multiple selectors to find product description
    const descriptionSelectors = [
      '.product-description',
      '.rte',
      '[data-product-description]',
      '.product__description',
      '.product-single__description',
      '.product-content .rte',
      '.product__content .rte',
      '.product-details .rte',
      '.product-information .rte',
      '.description',
      '.product-desc'
    ];

    let productDescription = null;
    
    // Try each selector until we find a description
    for (const selector of descriptionSelectors) {
      productDescription = productGrid.querySelector(selector);
      if (productDescription && productDescription.textContent.trim()) {
        console.log(`Found description with selector: ${selector}`); // Debug log
        break;
      }
    }

    if (!productDescription) {
      console.log('No product description found in any of the selectors'); // Debug log
      console.log('Available elements in productGrid:', [...productGrid.querySelectorAll('*')].map(el => el.className).filter(Boolean)); // Debug log
    } else {
      console.log('Description content:', productDescription.textContent.substring(0, 100) + '...'); // Debug log
    }

    if (isMobileBreakpoint()) {
      console.log('Mobile breakpoint detected'); // Debug log
      
      const productDetails = productGrid.querySelector('.product-details');
      if (!productDetails) {
        console.log('No product details found'); // Debug log
        return;
      }
      
      const productFormComponent = productGrid.querySelector('product-form-component');
      const variantPicker = productGrid.querySelector('variant-picker');
      const productPrice = productGrid.querySelector('product-price');
      
      const productTitle = document.createElement('a');
      productTitle.textContent = this.dataset.productTitle || '';
      productTitle.href = this.productPageUrl;

      if (!productFormComponent || !variantPicker || !productPrice || !productTitle) {
        console.log('Missing required components for mobile view'); // Debug log
        return;
      }

      const productHeader = document.createElement('div');
      productHeader.classList.add('product-header');

      productHeader.appendChild(productTitle);
      productHeader.appendChild(productPrice);
      
      // Add description if it exists
      if (productDescription) {
        const descriptionClone = productDescription.cloneNode(true);
        // Ensure it has the right classes for styling
        descriptionClone.classList.add('product-description', 'quick-add-description');
        descriptionClone.setAttribute('data-quick-add-content', 'true');
        
        // Create a wrapper for better styling
        const descriptionWrapper = document.createElement('div');
        descriptionWrapper.classList.add('quick-add-description-wrapper');
        descriptionWrapper.appendChild(descriptionClone);
        
        productHeader.appendChild(descriptionWrapper);
        console.log('Added description to mobile view'); // Debug log
      } else {
        console.log('No description to add to mobile view'); // Debug log
      }
      
      productGrid.appendChild(productHeader);
      productGrid.appendChild(variantPicker);
      productGrid.appendChild(productFormComponent);
      productDetails.remove();
    } else {
      console.log('Desktop breakpoint detected'); // Debug log
      
      // For desktop, ensure description is preserved and visible
      if (productDescription) {
        // Make sure the description has the right classes to bypass CSS hiding
        productDescription.classList.add('product-description', 'quick-add-description');
        productDescription.setAttribute('data-quick-add-content', 'true');
        
        // Also try to find the parent container and mark it
        const parentContainer = productDescription.closest('.group-block, .product-details, .rte');
        if (parentContainer) {
          parentContainer.classList.add('has-description');
          parentContainer.setAttribute('data-contains-description', 'true');
        }
        
        console.log('Prepared description for desktop view'); // Debug log
      } else {
        console.log('No description found for desktop view'); // Debug log
      }
    }

    morph(modalContent, productGrid);

    // After morphing, let's verify the description is there
    setTimeout(() => {
      const descriptionInModal = modalContent.querySelector('.product-description, .quick-add-description, [data-quick-add-content]');
      if (descriptionInModal) {
        console.log('Description successfully added to modal'); // Debug log
      } else {
        console.log('Description NOT found in modal after morphing'); // Debug log
      }
    }, 100);

    this.#syncVariantSelection(modalContent);
  }

  /**
   * Syncs the variant selection from the product card to the modal
   * @param {Element} modalContent - The modal content element
   */
  #syncVariantSelection(modalContent) {
    const selectedVariantId = this.#getSelectedVariantId();
    if (!selectedVariantId) return;

    // Find and check the corresponding input in the modal
    const modalInputs = modalContent.querySelectorAll('input[type="radio"][data-variant-id]');
    for (const input of modalInputs) {
      if (input instanceof HTMLInputElement && input.dataset.variantId === selectedVariantId && !input.checked) {
        input.checked = true;
        input.dispatchEvent(new Event('change', { bubbles: true }));
        break;
      }
    }
  }
}

if (!customElements.get('quick-add-component')) {
  customElements.define('quick-add-component', QuickAddComponent);
}

class QuickAddDialog extends DialogComponent {
  #abortController = new AbortController();

  connectedCallback() {
    super.connectedCallback();

    this.addEventListener(ThemeEvents.cartUpdate, this.handleCartUpdate, { signal: this.#abortController.signal });
    this.addEventListener(ThemeEvents.variantUpdate, this.#updateProductTitleLink);

    this.addEventListener(DialogCloseEvent.eventName, this.#handleDialogClose);
  }

  disconnectedCallback() {
    super.disconnectedCallback();

    this.#abortController.abort();
    this.removeEventListener(DialogCloseEvent.eventName, this.#handleDialogClose);
  }

  /**
   * Closes the dialog
   * @param {CartUpdateEvent} event - The cart update event
   */
  handleCartUpdate = (event) => {
    if (event.detail.data.didError) return;
    this.closeDialog();
  };

  #updateProductTitleLink = (/** @type {CustomEvent} */ event) => {
    const anchorElement = /** @type {HTMLAnchorElement} */ (
      event.detail.data.html?.querySelector('.view-product-title a')
    );
    const viewMoreDetailsLink = /** @type {HTMLAnchorElement} */ (this.querySelector('.view-product-title a'));
    const mobileProductTitle = /** @type {HTMLAnchorElement} */ (this.querySelector('.product-header a'));

    if (!anchorElement) return;

    if (viewMoreDetailsLink) viewMoreDetailsLink.href = anchorElement.href;
    if (mobileProductTitle) mobileProductTitle.href = anchorElement.href;
  };

  #handleDialogClose = () => {
    const iosVersion = getIOSVersion();
   
    if (!iosVersion || iosVersion.major >= 17 || (iosVersion.major === 16 && iosVersion.minor >= 4)) return;

    requestAnimationFrame(() => {
      /** @type {HTMLElement | null} */
      const grid = document.querySelector('#ResultsList [product-grid-view]');
      if (grid) {
        const currentWidth = grid.getBoundingClientRect().width;
        grid.style.width = `${currentWidth - 1}px`;
        requestAnimationFrame(() => {
          grid.style.width = '';
        });
      }
    });
  };
}

if (!customElements.get('quick-add-dialog')) {
  customElements.define('quick-add-dialog', QuickAddDialog);
}