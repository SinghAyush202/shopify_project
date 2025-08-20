# README: quick-add.js

## Overview

This JavaScript file powers the "Quick Add" functionality for products within the Shopify theme. It allows users to click a button (e.g., a `+` sign) on a product card to open a modal window. This modal displays product details, variant options (like size and color), and an "Add to Cart" button, all without requiring the user to navigate away from the current collection or search results page.

The script is built using modern JavaScript features, including ES6 classes and custom elements, to create modular and maintainable components.

---

## Core Components

The functionality is split into two main custom elements:

### 1. `QuickAddComponent`

This is the primary controller component that is attached to the quick-add button on each product card.

**Responsibilities:**

*   **Event Handling**: Listens for the `click` event on the quick-add button.
*   **URL Management**: Constructs the correct product page URL, including any pre-selected variant ID.
*   **Content Fetching**: Asynchronously fetches the full product page's HTML content.
*   **Caching**: Implements a caching mechanism (`#cachedContent`) to store fetched product page HTML. This prevents redundant network requests for the same product, significantly improving performance on repeated clicks.
*   **Modal Content Preparation**: Calls `updateQuickAddModal` to process the fetched HTML and prepare it for display within the modal.
*   **Modal Control**: Triggers the opening of the quick-add modal.

### 2. `QuickAddDialog`

This component represents the modal window (dialog) itself. It extends a base `DialogComponent` to handle standard dialog behaviors.

**Responsibilities:**

*   **State Management**: Manages the open/closed state of the modal.
*   **Event Listening**: Listens for custom theme events. For example, it listens for a `cart:updated` event to automatically close the modal after a product is successfully added to the cart.
*   **UI Patches**: Includes specific workarounds, such as a fix for a UI freezing bug on older versions of iOS.

---

## Detailed Workflow

1.  **Click Event**: A user clicks the quick-add button on a product card.
2.  **Fetch or Cache**: The `handleClick` method in `QuickAddComponent` is triggered. It first checks if the content for the corresponding product page URL is already in its cache.
    *   If **cached**, it uses the stored HTML.
    *   If **not cached**, it fetches the product page's HTML and stores it in the cache for future use. It uses an `AbortController` to cancel any pending fetch requests if the user clicks another button quickly.
3.  **Content Adaptation (`updateQuickAddModal`)**: This is the most critical step. The method receives the raw HTML from the product page and adapts it for the modal view.
    *   **Mobile vs. Desktop**: It detects if the user is on a mobile device and applies different logic.
    *   **On Mobile**: It deconstructs the standard product page layout (`.product-details`) and reconstructs a mobile-friendly view inside the modal. It specifically extracts the title, price, variant picker, and **product description** before the original container is discarded.
    *   **On Desktop**: The layout is less complex, but the script still ensures the product description is correctly identified and prepared for display.
4.  **DOM Update**: The script uses a `morph` function (from a library like `idiomorph`) to efficiently update the modal's content with the newly prepared HTML. This is more performant than replacing the entire `innerHTML`, as it only changes the parts of the DOM that are different.
5.  **Variant Sync**: After the content is updated, the `#syncVariantSelection` method ensures that if a variant was already selected on the product card, that same variant is automatically selected in the modal.
6.  **Display Modal**: The `showDialog()` method on the `QuickAddDialog` component is called, and the pop-up appears to the user, fully populated with the product's information.

---

## Dependencies

This script relies on several internal theme modules:

*   `@theme/morph`: For efficient DOM updates.
*   `@theme/component`: A base class for creating custom components.
*   `@theme/events`: Defines custom theme-wide events (e.g., `CartUpdateEvent`).
*   `@theme/dialog`: A base class for creating dialog/modal components.
*   `@theme/utilities`: A collection of helper functions (e.g., `isMobileBreakpoint`).
