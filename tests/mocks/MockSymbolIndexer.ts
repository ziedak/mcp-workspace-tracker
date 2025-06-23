import { ISymbolIndexer } from "../../src/core/interfaces/ISymbolIndexer";
import { Symbol, SymbolKind } from "../../src/core/models/Symbol";

/**
 * Mock implementation of ISymbolIndexer for testing
 */
export class MockSymbolIndexer implements ISymbolIndexer {
	private symbols: Map<string, Symbol[]> = new Map();

	async indexFiles(files: string[]): Promise<void> {
		return Promise.resolve();
	}

	async searchSymbols(query: string, kind?: SymbolKind): Promise<Symbol[]> {
		const results: Symbol[] = [];

		for (const symbols of this.symbols.values()) {
			for (const symbol of symbols) {
				if (
					(kind === undefined || symbol.kind === kind) &&
					(symbol.name.toLowerCase().includes(query.toLowerCase()) ||
						(symbol.documentation &&
							symbol.documentation.toLowerCase().includes(query.toLowerCase())))
				) {
					results.push(symbol);
				}
			}
		}

		return results;
	}

	async getFileSymbols(filePath: string): Promise<Symbol[]> {
		return this.symbols.get(filePath) || [];
	}

	clearIndex(): void {
		this.symbols.clear();
	}

	/**
	 * Helper to set mock symbols for testing
	 */
	setFileSymbols(filePath: string, symbols: Symbol[]): void {
		this.symbols.set(filePath, [...symbols]);
	}
}
