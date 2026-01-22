/**
 * SIMPLIFIED SEARCH & ACTION FUNCTIONS
 * NO INFINITE LOOPS - Single comprehensive search, then move on
 */

/**
 * Search for a clickable element everywhere and click it
 * SEARCHES:
 * - Main page DOM
 * - All visible iframes
 * - All nested iframes
 * - All popup windows
 * 
 * ACTION: Click if found, return false if not found (don't retry)
 */
async function clickWithRetry(target: string, maxRetries: number = 1): Promise<boolean> {
    if (!state.page || state.page.isClosed()) return false;

    log(`[CLICK SEARCH] Looking for: "${target}"`);

    try {
        // Search 1: Main page visible clickables
        const mainPageClicked = await state.page.evaluate((searchText) => {
            const searchLower = searchText.toLowerCase();
            const clickables = document.querySelectorAll('button, a, [role="button"], [role="tab"], input[type="button"]');
            
            for (const el of Array.from(clickables)) {
                const text = el.textContent?.toLowerCase() || '';
                const ariaLabel = el.getAttribute('aria-label')?.toLowerCase() || '';
                const title = el.getAttribute('title')?.toLowerCase() || '';
                
                if (text.includes(searchLower) || ariaLabel.includes(searchLower) || title.includes(searchLower)) {
                    const rect = (el as HTMLElement).getBoundingClientRect();
                    const style = window.getComputedStyle(el);
                    
                    // Check if visible
                    if (rect.width > 0 && rect.height > 0 && 
                        style.display !== 'none' && style.visibility !== 'hidden') {
                        
                        (el as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' });
                        (el as HTMLElement).click();
                        return true;
                    }
                }
            }
            return false;
        }, target);

        if (mainPageClicked) {
            log(`✓ Found and clicked on main page`);
            await state.page.waitForTimeout(500);
            return true;
        }

        // Search 2: All iframes (level 1)
        const iframeClicked = await state.page.evaluate((searchText) => {
            const searchLower = searchText.toLowerCase();
            const iframes = document.querySelectorAll('iframe');
            
            for (const iframe of Array.from(iframes)) {
                try {
                    const iframeDoc = (iframe as any).contentDocument || (iframe as any).contentWindow?.document;
                    if (!iframeDoc) continue;
                    
                    const clickables = iframeDoc.querySelectorAll('button, a, [role="button"], [role="tab"], input[type="button"]');
                    
                    for (const el of Array.from(clickables)) {
                        const text = el.textContent?.toLowerCase() || '';
                        const ariaLabel = el.getAttribute('aria-label')?.toLowerCase() || '';
                        const title = el.getAttribute('title')?.toLowerCase() || '';
                        
                        if (text.includes(searchLower) || ariaLabel.includes(searchLower) || title.includes(searchLower)) {
                            const rect = (el as HTMLElement).getBoundingClientRect();
                            if (rect.width > 0 && rect.height > 0) {
                                (el as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' });
                                (el as HTMLElement).click();
                                return true;
                            }
                        }
                    }
                } catch (e) {
                    // Cross-origin iframe - skip
                }
            }
            return false;
        }, target);

        if (iframeClicked) {
            log(`✓ Found and clicked in iframe`);
            await state.page.waitForTimeout(500);
            return true;
        }

        // Search 3: All popup windows
        for (const popup of allPages) {
            if (popup && !popup.isClosed()) {
                try {
                    const popupClicked = await popup.evaluate((searchText) => {
                        const searchLower = searchText.toLowerCase();
                        const clickables = document.querySelectorAll('button, a, [role="button"], [role="tab"], input[type="button"]');
                        
                        for (const el of Array.from(clickables)) {
                            const text = el.textContent?.toLowerCase() || '';
                            const ariaLabel = el.getAttribute('aria-label')?.toLowerCase() || '';
                            
                            if (text.includes(searchLower) || ariaLabel.includes(searchLower)) {
                                (el as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' });
                                (el as HTMLElement).click();
                                return true;
                            }
                        }
                        return false;
                    }, target);

                    if (popupClicked) {
                        log(`✓ Found and clicked in popup window`);
                        await popup.waitForTimeout(500);
                        return true;
                    }
                } catch (e) {
                    // Popup closed or error
                }
            }
        }

        log(`✗ Element not found anywhere: "${target}"`);
        return false;

    } catch (error: any) {
        log(`[CLICK ERROR] ${error.message}`);
        return false;
    }
}

/**
 * Search for an input/textarea field and fill it
 * SEARCHES:
 * - Main page inputs/textareas
 * - All visible iframes
 * - All popup windows
 * 
 * ACTION: Fill if found, return false if not found (don't retry)
 */
async function fillWithRetry(target: string, value: string, maxRetries: number = 1): Promise<boolean> {
    if (!state.page || state.page.isClosed()) return false;

    log(`[FILL SEARCH] Looking for input: "${target}"`);

    try {
        // Search 1: Main page inputs
        const mainPageFilled = await state.page.evaluate(({ searchText, fillValue }) => {
            const searchLower = searchText.toLowerCase();
            const inputs = document.querySelectorAll('input, textarea');
            
            for (const input of Array.from(inputs)) {
                const placeholder = (input as any).placeholder?.toLowerCase() || '';
                const label = input.getAttribute('aria-label')?.toLowerCase() || '';
                const id = input.getAttribute('id')?.toLowerCase() || '';
                const name = input.getAttribute('name')?.toLowerCase() || '';
                
                if (placeholder.includes(searchLower) || label.includes(searchLower) || 
                    id.includes(searchLower) || name.includes(searchLower)) {
                    
                    const rect = (input as HTMLElement).getBoundingClientRect();
                    const style = window.getComputedStyle(input);
                    
                    // Check if visible and enabled
                    if (rect.width > 0 && rect.height > 0 && 
                        style.display !== 'none' && style.visibility !== 'hidden' &&
                        !(input as any).disabled) {
                        
                        (input as HTMLElement).scrollIntoView({ behavior: 'smooth', block: 'center' });
                        (input as any).value = fillValue;
                        input.dispatchEvent(new Event('input', { bubbles: true }));
                        input.dispatchEvent(new Event('change', { bubbles: true }));
                        return true;
                    }
                }
            }
            return false;
        }, { searchText: target, fillValue: value });

        if (mainPageFilled) {
            log(`✓ Found and filled input on main page`);
            await state.page.waitForTimeout(300);
            return true;
        }

        // Search 2: All iframes
        const iframeFilled = await state.page.evaluate(({ searchText, fillValue }) => {
            const searchLower = searchText.toLowerCase();
            const iframes = document.querySelectorAll('iframe');
            
            for (const iframe of Array.from(iframes)) {
                try {
                    const iframeDoc = (iframe as any).contentDocument || (iframe as any).contentWindow?.document;
                    if (!iframeDoc) continue;
                    
                    const inputs = iframeDoc.querySelectorAll('input, textarea');
                    
                    for (const input of Array.from(inputs)) {
                        const placeholder = (input as any).placeholder?.toLowerCase() || '';
                        const label = input.getAttribute('aria-label')?.toLowerCase() || '';
                        const id = input.getAttribute('id')?.toLowerCase() || '';
                        const name = input.getAttribute('name')?.toLowerCase() || '';
                        
                        if (placeholder.includes(searchLower) || label.includes(searchLower) || 
                            id.includes(searchLower) || name.includes(searchLower)) {
                            
                            (input as any).value = fillValue;
                            input.dispatchEvent(new Event('input', { bubbles: true }));
                            input.dispatchEvent(new Event('change', { bubbles: true }));
                            return true;
                        }
                    }
                } catch (e) {
                    // Cross-origin iframe - skip
                }
            }
            return false;
        }, { searchText: target, fillValue: value });

        if (iframeFilled) {
            log(`✓ Found and filled input in iframe`);
            await state.page.waitForTimeout(300);
            return true;
        }

        // Search 3: All popup windows
        for (const popup of allPages) {
            if (popup && !popup.isClosed()) {
                try {
                    const popupFilled = await popup.evaluate(({ searchText, fillValue }) => {
                        const searchLower = searchText.toLowerCase();
                        const inputs = document.querySelectorAll('input, textarea');
                        
                        for (const input of Array.from(inputs)) {
                            const placeholder = (input as any).placeholder?.toLowerCase() || '';
                            const label = input.getAttribute('aria-label')?.toLowerCase() || '';
                            
                            if (placeholder.includes(searchLower) || label.includes(searchLower)) {
                                (input as any).value = fillValue;
                                input.dispatchEvent(new Event('input', { bubbles: true }));
                                input.dispatchEvent(new Event('change', { bubbles: true }));
                                return true;
                            }
                        }
                        return false;
                    }, { searchText: target, fillValue: value });

                    if (popupFilled) {
                        log(`✓ Found and filled input in popup`);
                        await popup.waitForTimeout(300);
                        return true;
                    }
                } catch (e) {
                    // Popup error
                }
            }
        }

        log(`✗ Input field not found anywhere: "${target}"`);
        return false;

    } catch (error: any) {
        log(`[FILL ERROR] ${error.message}`);
        return false;
    }
}
