declare module "minimatch" {
	function minimatch(path: string, pattern: string, options?: minimatch.IOptions): boolean;

	namespace minimatch {
		interface IOptions {
			dot?: boolean;
			nobrace?: boolean;
			noglobstar?: boolean;
			noext?: boolean;
			nocase?: boolean;
			nonull?: boolean;
			matchBase?: boolean;
			nocomment?: boolean;
			escape?: boolean;
			debug?: boolean;
		}
	}

	export = minimatch;
}

// Make this file a module with an export statement to enable global augmentation
export {};

// Now we can declare globals
declare global {
	// Using var instead of namespace approach for simplicity
	var minimatchFn: (path: string, pattern: string, options?: any) => boolean;
}
