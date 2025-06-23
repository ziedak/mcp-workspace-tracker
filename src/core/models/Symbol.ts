/**
 * Represents a symbol discovered in the codebase
 */
export interface Symbol {
	/** Symbol name */
	name: string;

	/** Symbol kind (class, function, variable, etc) */
	kind: SymbolKind;

	/** File location information */
	location: {
		/** Path to containing file */
		filePath: string;

		/** Line number (1-indexed) */
		line: number;

		/** Character position (1-indexed) */
		character: number;
	};

	/** Documentation comments if available */
	documentation: string;

	/** Parent symbol name if applicable */
	parentName?: string;

	/** Export status */
	exportStatus: "exported" | "default" | "none";

	/** Child symbols if applicable */
	children?: Symbol[];
}

/**
 * Symbol kinds
 */
export enum SymbolKind {
	CLASS = "class",
	INTERFACE = "interface",
	FUNCTION = "function",
	METHOD = "method",
	PROPERTY = "property",
	VARIABLE = "variable",
	ENUM = "enum",
	TYPE_ALIAS = "typeAlias",
	NAMESPACE = "namespace",
	MODULE = "module",
}
