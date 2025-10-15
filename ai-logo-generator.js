// AI Logo Generator using Pollinations.ai
class AILogoGenerator {
    constructor() {
        this.baseUrl = 'https://image.pollinations.ai/prompt';
        this.isGenerating = false;
    }

    /**
     * Generate a logo using Pollinations.ai API
     * @param {string} prompt - The logo description
     * @param {object} options - Generation options (style, size, etc.)
     * @returns {Promise<string>} - URL of the generated image
     */
    async generateLogo(prompt, options = {}) {
        if (this.isGenerating) {
            throw new Error('Logo generation already in progress');
        }

        // Validate prompt
        if (!prompt || prompt.trim().length < 3) {
            throw new Error('Please provide a valid logo description (at least 3 characters)');
        }

        this.isGenerating = true;

        try {
            // Build the prompt with style if provided
            let fullPrompt = prompt.trim();
            if (options.style && options.style !== '') {
                fullPrompt = `${options.style} style logo: ${fullPrompt}`;
            }
            
            // Add logo-specific keywords to improve results
            fullPrompt = `professional ${fullPrompt}, clean background, high quality logo design`;

            // Build the URL with parameters
            const params = new URLSearchParams({
                width: options.size || '768',
                height: options.size || '768',
                seed: Date.now(), // Use timestamp as seed for uniqueness
                nologo: 'true',
                enhance: 'true'
            });

            // Encode the prompt properly
            const encodedPrompt = encodeURIComponent(fullPrompt);
            const imageUrl = `${this.baseUrl}/${encodedPrompt}?${params.toString()}`;

            // Validate that the image loads successfully
            await this.validateImageUrl(imageUrl);

            return imageUrl;
        } finally {
            this.isGenerating = false;
        }
    }

    /**
     * Validate that an image URL can be loaded
     * @param {string} url - The image URL to validate
     * @returns {Promise<void>}
     */
    validateImageUrl(url) {
        return new Promise((resolve, reject) => {
            const img = new Image();
            img.crossOrigin = 'anonymous';
            
            // Set a timeout for loading
            const timeout = setTimeout(() => {
                reject(new Error('Image loading timed out. Please try again.'));
            }, 30000); // 30 second timeout

            img.onload = () => {
                clearTimeout(timeout);
                resolve();
            };

            img.onerror = () => {
                clearTimeout(timeout);
                reject(new Error('Failed to load generated image. Please try again with a different description.'));
            };

            img.src = url;
        });
    }

    /**
     * Check if generation is in progress
     * @returns {boolean}
     */
    isLoading() {
        return this.isGenerating;
    }
}

// Initialize the AI Logo Generator
const aiLogoGenerator = new AILogoGenerator();

// UI Controller for the AI Logo Modal
class AILogoModalController {
    constructor() {
        this.modal = null;
        this.form = null;
        this.promptInput = null;
        this.styleSelect = null;
        this.sizeSelect = null;
        this.generateBtn = null;
        this.cancelBtn = null;
        this.closeBtn = null;
        this.errorDiv = null;
        this.successDiv = null;
        this.btnText = null;
        this.btnLoading = null;

        this.initElements();
        this.initEventListeners();
    }

    initElements() {
        this.modal = document.getElementById('aiLogoModal');
        this.form = document.getElementById('aiLogoForm');
        this.promptInput = document.getElementById('logoPrompt');
        this.styleSelect = document.getElementById('logoStyle');
        this.sizeSelect = document.getElementById('logoSize');
        this.generateBtn = document.getElementById('generateAiLogo');
        this.cancelBtn = document.getElementById('cancelAiLogo');
        this.closeBtn = document.getElementById('closeModal');
        this.errorDiv = document.getElementById('aiLogoError');
        this.successDiv = document.getElementById('aiLogoSuccess');
        this.btnText = this.generateBtn.querySelector('.btn-text');
        this.btnLoading = this.generateBtn.querySelector('.btn-loading');
    }

    initEventListeners() {
        // Open modal
        const aiLogoBtn = document.getElementById('aiLogo');
        if (aiLogoBtn) {
            aiLogoBtn.addEventListener('click', () => this.openModal());
        }

        // Close modal
        this.closeBtn.addEventListener('click', () => this.closeModal());
        this.cancelBtn.addEventListener('click', () => this.closeModal());

        // Click outside modal to close
        this.modal.addEventListener('click', (e) => {
            if (e.target === this.modal) {
                this.closeModal();
            }
        });

        // Form submission
        this.form.addEventListener('submit', (e) => {
            e.preventDefault();
            this.handleGenerateLogo();
        });

        // Escape key to close
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && this.modal.style.display === 'flex') {
                this.closeModal();
            }
        });
    }

    openModal() {
        this.modal.style.display = 'flex';
        this.promptInput.focus();
        this.clearMessages();
        this.form.reset();
    }

    closeModal() {
        if (!aiLogoGenerator.isLoading()) {
            this.modal.style.display = 'none';
            this.clearMessages();
            this.form.reset();
        }
    }

    clearMessages() {
        this.errorDiv.style.display = 'none';
        this.successDiv.style.display = 'none';
        this.errorDiv.textContent = '';
        this.successDiv.textContent = '';
    }

    showError(message) {
        this.errorDiv.textContent = message;
        this.errorDiv.style.display = 'block';
        this.successDiv.style.display = 'none';
    }

    showSuccess(message) {
        this.successDiv.textContent = message;
        this.successDiv.style.display = 'block';
        this.errorDiv.style.display = 'none';
    }

    setLoading(loading) {
        if (loading) {
            this.btnText.style.display = 'none';
            this.btnLoading.style.display = 'inline-flex';
            this.generateBtn.disabled = true;
            this.promptInput.disabled = true;
            this.styleSelect.disabled = true;
            this.sizeSelect.disabled = true;
            this.cancelBtn.disabled = true;
        } else {
            this.btnText.style.display = 'inline';
            this.btnLoading.style.display = 'none';
            this.generateBtn.disabled = false;
            this.promptInput.disabled = false;
            this.styleSelect.disabled = false;
            this.sizeSelect.disabled = false;
            this.cancelBtn.disabled = false;
        }
    }

    async handleGenerateLogo() {
        this.clearMessages();

        const prompt = this.promptInput.value.trim();
        const style = this.styleSelect.value;
        const size = this.sizeSelect.value;

        // Validate prompt
        if (!prompt || prompt.length < 3) {
            this.showError('Please enter a logo description (at least 3 characters)');
            return;
        }

        this.setLoading(true);

        try {
            // Generate the logo
            const imageUrl = await aiLogoGenerator.generateLogo(prompt, {
                style: style,
                size: size
            });

            // Add the logo to the canvas
            if (typeof editor !== 'undefined' && editor) {
                editor.addImage(imageUrl);
                
                // Update layers list if function exists
                if (typeof updateLayersList === 'function') {
                    updateLayersList();
                }

                this.showSuccess('✓ Logo generated and added to canvas!');

                // Close modal after a short delay
                setTimeout(() => {
                    this.closeModal();
                }, 1500);
            } else {
                this.showError('Canvas editor not available. Please refresh the page.');
            }
        } catch (error) {
            console.error('Error generating logo:', error);
            this.showError(error.message || 'Failed to generate logo. Please try again.');
        } finally {
            this.setLoading(false);
        }
    }
}

// Initialize the modal controller when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
    new AILogoModalController();
});
