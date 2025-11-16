  import { cocktailAPI } from '../api/client';
  import type { CocktailSummary, CocktailDetail } from '../types/cocktail';
  // TEMPORARY: Import example data for styling
  import { exampleCocktails } from '../data/cocktails';
  import type { CocktailConfig } from '../types';
  import { glassIconGenerators, type GlassIconName } from '../ui/GlassIcons';
  export class ShelfPanel {
    private cocktails: CocktailSummary[] = [];
    private loading: boolean = true;
    private greeting: string = '';
    private onCocktailSelectCallback?: (cocktail: CocktailDetail) => void;

    constructor(onCocktailSelect?: (cocktail: CocktailDetail) => void) {
      this.onCocktailSelectCallback = onCocktailSelect;
      this.initialize();
    }

    private async initialize() {
      // Expose refresh function globally for WebSocket updates
      (window as any).refreshShelfPanel = () => this.loadShelf();

      // Load initial data
      await this.loadShelf();
    }

    public async loadShelf(): Promise<void> {
      try {
        this.loading = true;
        // TEMPORARY: Using example data for styling - comment out API call
        // const response = await cocktailAPI.getUserShelf();
        // this.cocktails = response.cocktails;
        // this.greeting = response.agent_greeting;

        // Load example cocktails (first 3 for display)
        this.cocktails = exampleCocktails.slice(0, 3).map(config =>
          this.cocktailConfigToSummary(config)
        );
        this.greeting = 'Welcome to your cocktail shelf! Here are some example drinks.';

        this.updateDisplay();
      } catch (error) {
        console.error('Failed to load shelf:', error);
        this.showError('Failed to load cocktails');
      } finally {
        this.loading = false;
      }
    }

    private updateDisplay(): void {
      // Clear existing shelf boxes
      const existingShelfBoxes = document.querySelectorAll('.shelf-box');
      existingShelfBoxes.forEach(box => box.remove());

      // Show loading state
      if (this.loading) {
        this.showLoading();
        return;
      }

      // Create new shelf boxes
      const recipeContent = document.querySelector('.recipe-content');
      if (!recipeContent) {
        console.error('Recipe content container not found');
        return;
      }

      // Add greeting (could be displayed somewhere)
      console.log('Agent greeting:', this.greeting);

      // Create cocktail cards (limit to 3 for display)
      this.cocktails.slice(0, 3).forEach(cocktail => {
        const shelfBox = this.createShelfBox(cocktail);
        recipeContent.appendChild(shelfBox);
      });

      // If no cocktails, show empty state
      if (this.cocktails.length === 0) {
        this.showEmptyState(recipeContent);
      }
    }

    private createShelfBox(cocktail: CocktailSummary): HTMLElement {
      const shelfBox = document.createElement('div');
      shelfBox.className = 'shelf-box';
      shelfBox.style.cursor = 'pointer';
      shelfBox.style.display = 'none'; // Start hidden, will be shown when shelf view is active

      // TEMPORARY: Use example cocktail data to get the glass type and liquid color
      const exampleCocktail = exampleCocktails.find(c => c.id === cocktail.id);
      const glassType = (exampleCocktail?.glassType as GlassIconName) || 'cocktail';
      const liquidColor = exampleCocktail?.liquidColor || '#CC2739';

      // Generate glass icon SVG
      const glassIconSvg = this.generateGlassIcon(glassType, liquidColor);

      shelfBox.innerHTML = `
        <div class="drink-img">${glassIconSvg}</div>
        <div class="drink-text">
          <div class="message drink-title">${this.escapeHtml(cocktail.name)}</div>
          <div class="message drink-info">${this.escapeHtml(cocktail.ingredients_summary)}</div>
        </div>
      `;

      // Add click handler
      shelfBox.addEventListener('click', () => this.selectCocktail(cocktail.id));

      return shelfBox;
    }

    /**
     * Generates a glass icon SVG
     */
    private generateGlassIcon(glassType: GlassIconName = 'cocktail', liquidColor: string = '#CC2739'): string {
      const generator = glassIconGenerators[glassType];
      if (!generator) {
        console.warn(`Unknown glass type: ${glassType}, using default`);
        return glassIconGenerators.cocktail({ liquidColor, width: 64, height: 64 });
      }
      return generator({ liquidColor, width: 64, height: 64 });
    }

    private async selectCocktail(cocktailId: string): Promise<void> {
      try {
        const detail = await cocktailAPI.getCocktailDetail(cocktailId);

        // Call callback if provided
        if (this.onCocktailSelectCallback) {
          this.onCocktailSelectCallback(detail);
        }

        // Update the main display
        this.updateRecipeDisplay(detail);

        // Switch to recipe view
        this.switchToRecipeView();

      } catch (error) {
        console.error('Failed to load cocktail details:', error);
        this.showError('Failed to load cocktail details');
      }
    }

    private updateRecipeDisplay(cocktail: CocktailDetail): void {
      // Update ingredients
      const ingredientsContainer = document.querySelector('.ingredients-box .message-container');
      if (ingredientsContainer) {
        ingredientsContainer.innerHTML = '';
        cocktail.ingredients.forEach((ing, index) => {
          const messageDiv = document.createElement('div');
          messageDiv.className = 'message bot';
          messageDiv.textContent = `${index + 1}. ${ing.quantity} ${ing.unit} ${ing.name}`;
          ingredientsContainer.appendChild(messageDiv);
        });
      }

      // Update recipe
      const recipeContainer = document.querySelector('.recipe-box .message-container');
      if (recipeContainer) {
        recipeContainer.innerHTML = '';
        const messageDiv = document.createElement('div');
        messageDiv.className = 'message bot';
        messageDiv.textContent = cocktail.description || 'Cocktail preparation instructions.';
        recipeContainer.appendChild(messageDiv);
      }
    }

    private switchToRecipeView(): void {
      const recipeButton = Array.from(document.querySelectorAll('.recipe-btn')).find(btn =>
        btn.textContent === 'RECIPE'
      ) as HTMLButtonElement;

      if (recipeButton) {
        recipeButton.click();
      }
    }

    private showLoading(): void {
      const recipeContent = document.querySelector('.recipe-content');
      if (recipeContent) {
        const loadingDiv = document.createElement('div');
        loadingDiv.className = 'shelf-loading';
        loadingDiv.textContent = 'Loading cocktails...';
        loadingDiv.style.cssText = `
          text-align: center;
          padding: 20px;
          color: #666;
          font-style: italic;
        `;
        recipeContent.appendChild(loadingDiv);
      }
    }

    private showError(message: string): void {
      const recipeContent = document.querySelector('.recipe-content');
      if (recipeContent) {
        const errorDiv = document.createElement('div');
        errorDiv.className = 'shelf-error';
        errorDiv.textContent = message;
        errorDiv.style.cssText = `
          text-align: center;
          padding: 20px;
          color: #f44336;
          background: #ffebee;
          border-radius: 4px;
          margin: 10px;
        `;
        recipeContent.appendChild(errorDiv);
      }
    }

    private showEmptyState(container: Element): void {
      const emptyDiv = document.createElement('div');
      emptyDiv.className = 'shelf-empty';
      emptyDiv.innerHTML = `
        <div style="text-align: center; padding: 40px; color: #666;">
          <h3>No cocktails yet!</h3>
          <p>Chat with Arthur to create your first cocktail.</p>
        </div>
      `;
      container.appendChild(emptyDiv);
    }

    // TEMPORARY: Helper function to convert example cocktail data to CocktailSummary format
    private cocktailConfigToSummary(config: CocktailConfig): CocktailSummary {
      return {
        id: config.id || '',
        name: config.name || '',
        ingredients_summary: config.ingredients.map(i => i.name).join(', '),
        created_at: new Date().toISOString()
      };
    }

    private escapeHtml(text: string): string {
      const div = document.createElement('div');
      div.textContent = text;
      return div.innerHTML;
    }

    public showShelfView(): void {
      // Hide recipe elements
      const ingredientsBox = document.querySelector('.ingredients-box') as HTMLElement;
      const recipeBox = document.querySelector('.recipe-box') as HTMLElement;
      const headers = document.querySelectorAll('.message.panel-header') as NodeListOf<HTMLElement>;

      if (ingredientsBox) ingredientsBox.style.display = 'none';
      if (recipeBox) recipeBox.style.display = 'none';
      headers.forEach(header => header.style.display = 'none');

      // Show shelf elements
      const shelfBoxes = document.querySelectorAll('.shelf-box') as NodeListOf<HTMLElement>;
      shelfBoxes.forEach(box => box.style.display = 'flex');

      // Update button states
      const shelfButton = Array.from(document.querySelectorAll('.recipe-btn')).find(btn =>
        btn.textContent === 'SHELF'
      ) as HTMLButtonElement;
      const recipeButton = Array.from(document.querySelectorAll('.recipe-btn')).find(btn =>
        btn.textContent === 'RECIPE'
      ) as HTMLButtonElement;

      if (shelfButton) shelfButton.classList.add('selected');
      if (recipeButton) recipeButton.classList.remove('selected');

      // Reload shelf data
      this.loadShelf();
    }

    public destroy(): void {
      // Cleanup
      if ((window as any).refreshShelfPanel) {
        delete (window as any).refreshShelfPanel;
      }
    }
  }