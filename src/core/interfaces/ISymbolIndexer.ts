import { Symbol, SymbolKind } from "../models/Symbol";

/**
 * Interface for symbol indexing service
 */
export interface ISymbolIndexer {
	/**
	 * Index files to extract symbols
	 * @param files - File paths to index
	 * @returns Promise resolving when indexing completes
	 */
	indexFiles(files: string[]): Promise<void>;

	/**
	 * Search for symbols matching query
	 * @param query - Search query string
	 * @param kind - Optional filter by symbol kind
	 * @returns Promise with matching symbols
	 */
	searchSymbols(query: string, kind?: SymbolKind): Promise<Symbol[]>;

	/**
	 * Get symbols for a specific file
	 * @param filePath - Path to file
	 * @returns Promise with symbols in file
	 */
	getFileSymbols(filePath: string): Promise<Symbol[]>;

	/**
	 * Clear index
	 */
	clearIndex(): void;
}
