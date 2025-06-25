#!/bin/bash

# =====================================================================
# Phase 2 Testing - Workspace Enhancer
# =====================================================================
# 
# This script enhances the sample workspace with complex TypeScript
# constructs specifically designed to test Phase 2 features:
# - Class hierarchy analysis
# - Dependency graph analysis
# - Interface implementation detection
# - Circular dependency detection
#
# Usage:
#   bash ./cli/phase2-test-scripts/enhance-test-workspace.sh
#
# Prerequisites:
#   The basic sample workspace must already be created at:
#   /tmp/mcp-sample-test/sample-workspace/
#
# =====================================================================


# Test script for Phase 2 features (class hierarchy and dependency analysis)
# This script creates additional TypeScript files with more complex class hierarchies
# and dependency relationships to stress test the upcoming Phase 2 features

# Define paths
SAMPLE_WORKSPACE="/tmp/mcp-sample-test/sample-workspace"

# Function to enhance the sample workspace for Phase 2 testing
enhance_sample_workspace() {
  echo "Enhancing sample workspace with more complex structures for Phase 2 testing..."
  
  # Create a deep class hierarchy
  mkdir -p $SAMPLE_WORKSPACE/src/models/hierarchy
  
  # Create a base class
  cat > $SAMPLE_WORKSPACE/src/models/hierarchy/BaseEntity.ts << 'EOL'
/**
 * Base entity for all domain objects
 */
export abstract class BaseEntity {
  protected id: string;
  protected createdAt: Date;
  protected updatedAt: Date;

  constructor(id: string) {
    this.id = id;
    this.createdAt = new Date();
    this.updatedAt = new Date();
  }

  getId(): string {
    return this.id;
  }

  getCreatedAt(): Date {
    return this.createdAt;
  }

  getUpdatedAt(): Date {
    return this.updatedAt;
  }

  abstract validate(): boolean;
}
EOL

  # Create an interface
  cat > $SAMPLE_WORKSPACE/src/models/hierarchy/Auditable.ts << 'EOL'
/**
 * Interface for objects that support audit tracking
 */
export interface Auditable {
  getAuditTrail(): AuditEntry[];
  addAuditEntry(entry: AuditEntry): void;
}

/**
 * Audit entry record
 */
export interface AuditEntry {
  timestamp: Date;
  action: string;
  userId: string;
  details: string;
}
EOL

  # Create a derived class
  cat > $SAMPLE_WORKSPACE/src/models/hierarchy/Person.ts << 'EOL'
import { BaseEntity } from './BaseEntity';
import { Auditable, AuditEntry } from './Auditable';

/**
 * Person base class
 */
export abstract class Person extends BaseEntity implements Auditable {
  protected firstName: string;
  protected lastName: string;
  protected email: string;
  private auditTrail: AuditEntry[] = [];

  constructor(id: string, firstName: string, lastName: string, email: string) {
    super(id);
    this.firstName = firstName;
    this.lastName = lastName;
    this.email = email;
  }

  getFullName(): string {
    return `${this.firstName} ${this.lastName}`;
  }

  getEmail(): string {
    return this.email;
  }

  setEmail(email: string): void {
    this.email = email;
    this.updatedAt = new Date();
  }

  getAuditTrail(): AuditEntry[] {
    return [...this.auditTrail];
  }

  addAuditEntry(entry: AuditEntry): void {
    this.auditTrail.push(entry);
  }

  override validate(): boolean {
    return this.firstName.length > 0 && 
           this.lastName.length > 0 && 
           this.email.includes('@');
  }
}
EOL

  # Create another interface
  cat > $SAMPLE_WORKSPACE/src/models/hierarchy/Contactable.ts << 'EOL'
/**
 * Interface for entities that can be contacted
 */
export interface Contactable {
  getContactMethods(): ContactMethod[];
  addContactMethod(method: ContactMethod): void;
  getPrimaryContactMethod(): ContactMethod | undefined;
}

/**
 * Contact method type enumeration
 */
export enum ContactType {
  EMAIL = 'email',
  PHONE = 'phone',
  SMS = 'sms',
  POSTAL = 'postal'
}

/**
 * Contact method structure
 */
export interface ContactMethod {
  type: ContactType;
  value: string;
  isPrimary: boolean;
  verified: boolean;
}
EOL

  # Create a concrete implementation with multiple interfaces
  cat > $SAMPLE_WORKSPACE/src/models/hierarchy/Employee.ts << 'EOL'
import { Person } from './Person';
import { Contactable, ContactMethod, ContactType } from './Contactable';

/**
 * Employee position enumeration
 */
export enum Position {
  DEVELOPER = 'developer',
  MANAGER = 'manager',
  DIRECTOR = 'director',
  EXECUTIVE = 'executive'
}

/**
 * Employee class implementing multiple interfaces
 */
export class Employee extends Person implements Contactable {
  private position: Position;
  private department: string;
  private salary: number;
  private contactMethods: ContactMethod[] = [];

  constructor(
    id: string, 
    firstName: string, 
    lastName: string, 
    email: string,
    position: Position,
    department: string,
    salary: number
  ) {
    super(id, firstName, lastName, email);
    this.position = position;
    this.department = department;
    this.salary = salary;
    
    // Add email as default contact method
    this.addContactMethod({
      type: ContactType.EMAIL,
      value: email,
      isPrimary: true,
      verified: false
    });
  }

  getPosition(): Position {
    return this.position;
  }

  getDepartment(): string {
    return this.department;
  }

  getSalary(): number {
    return this.salary;
  }

  getContactMethods(): ContactMethod[] {
    return [...this.contactMethods];
  }

  addContactMethod(method: ContactMethod): void {
    // If new method is primary, remove primary flag from others
    if (method.isPrimary) {
      this.contactMethods.forEach(m => m.isPrimary = false);
    }
    this.contactMethods.push(method);
  }

  getPrimaryContactMethod(): ContactMethod | undefined {
    return this.contactMethods.find(m => m.isPrimary);
  }
}
EOL

  # Create a decorator pattern
  cat > $SAMPLE_WORKSPACE/src/models/hierarchy/EmployeeDecorator.ts << 'EOL'
import { Employee } from './Employee';
import { Contactable, ContactMethod } from './Contactable';
import { Auditable, AuditEntry } from './Auditable';

/**
 * Base decorator for Employee
 */
export abstract class EmployeeDecorator implements Contactable, Auditable {
  protected employee: Employee;

  constructor(employee: Employee) {
    this.employee = employee;
  }

  // Delegate Contactable methods
  getContactMethods(): ContactMethod[] {
    return this.employee.getContactMethods();
  }

  addContactMethod(method: ContactMethod): void {
    this.employee.addContactMethod(method);
  }

  getPrimaryContactMethod(): ContactMethod | undefined {
    return this.employee.getPrimaryContactMethod();
  }

  // Delegate Auditable methods
  getAuditTrail(): AuditEntry[] {
    return this.employee.getAuditTrail();
  }

  addAuditEntry(entry: AuditEntry): void {
    this.employee.addAuditEntry(entry);
  }

  // Additional delegate methods
  getId(): string {
    return this.employee.getId();
  }

  getFullName(): string {
    return this.employee.getFullName();
  }
}

/**
 * Security clearance decorator for employees
 */
export class SecurityClearanceDecorator extends EmployeeDecorator {
  private clearanceLevel: number;
  private clearanceAreas: string[];

  constructor(employee: Employee, clearanceLevel: number, clearanceAreas: string[]) {
    super(employee);
    this.clearanceLevel = clearanceLevel;
    this.clearanceAreas = clearanceAreas;
  }

  getClearanceLevel(): number {
    return this.clearanceLevel;
  }

  getClearanceAreas(): string[] {
    return [...this.clearanceAreas];
  }

  addClearanceArea(area: string): void {
    this.clearanceAreas.push(area);
    this.addAuditEntry({
      timestamp: new Date(),
      action: 'CLEARANCE_UPDATE',
      userId: 'SYSTEM',
      details: `Added clearance area: ${area}`
    });
  }
}
EOL

  # Create a dependency graph test with circular references
  mkdir -p $SAMPLE_WORKSPACE/src/dependencies

  # Module A
  cat > $SAMPLE_WORKSPACE/src/dependencies/ModuleA.ts << 'EOL'
import { functionB } from './ModuleB';
import { DATA_C } from './ModuleC';

export const VERSION_A = '1.0.0';

export function functionA(): string {
  return `Module A (${VERSION_A}) calling: ${functionB()}`;
}

export function getDataC(): string {
  return `Module A accessing: ${DATA_C}`;
}
EOL

  # Module B
  cat > $SAMPLE_WORKSPACE/src/dependencies/ModuleB.ts << 'EOL'
import { VERSION_A, getDataC } from './ModuleA';  // Circular dependency!
import { ModuleD } from './ModuleD';

export function functionB(): string {
  return `Module B using version ${VERSION_A} and data: ${getDataC()}`;
}

export class ClassB {
  constructor(private d: ModuleD) {}
  
  process(): string {
    return `ClassB processed with ${this.d.getName()}`;
  }
}
EOL

  # Module C
  cat > $SAMPLE_WORKSPACE/src/dependencies/ModuleC.ts << 'EOL'
import { ModuleE } from './ModuleE';

export const DATA_C = 'Important data from Module C';

export class ServiceC {
  private e: ModuleE;
  
  constructor() {
    this.e = new ModuleE();
  }
  
  initialize(): void {
    console.log(`Service C initialized with ${this.e.getVersion()}`);
  }
}
EOL

  # Module D
  cat > $SAMPLE_WORKSPACE/src/dependencies/ModuleD.ts << 'EOL'
export class ModuleD {
  private name: string;
  
  constructor(name: string) {
    this.name = name;
  }
  
  getName(): string {
    return this.name;
  }
}
EOL

  # Module E
  cat > $SAMPLE_WORKSPACE/src/dependencies/ModuleE.ts << 'EOL'
import { DATA_C } from './ModuleC';  // Circular dependency!

export class ModuleE {
  private version = '2.0.0';
  
  getVersion(): string {
    return this.version;
  }
  
  getData(): string {
    return DATA_C;
  }
}
EOL

  # Main module that imports everything
  cat > $SAMPLE_WORKSPACE/src/dependencies/index.ts << 'EOL'
import { functionA, VERSION_A } from './ModuleA';
import { functionB, ClassB } from './ModuleB';
import { DATA_C, ServiceC } from './ModuleC';
import { ModuleD } from './ModuleD';
import { ModuleE } from './ModuleE';

// This file demonstrates complex dependencies

export function initializeSystem(): void {
  console.log(`System initialized with version ${VERSION_A}`);
  console.log(`Function calls: ${functionA()} and ${functionB()}`);
  console.log(`Data: ${DATA_C}`);
  
  const d = new ModuleD('Test Module D');
  const b = new ClassB(d);
  console.log(b.process());
  
  const c = new ServiceC();
  c.initialize();
  
  const e = new ModuleE();
  console.log(`Module E data: ${e.getData()}`);
}
EOL

  # Create a mixin test case
  mkdir -p $SAMPLE_WORKSPACE/src/mixins

  cat > $SAMPLE_WORKSPACE/src/mixins/mixins.ts << 'EOL'
// Type for a constructor function
type Constructor<T = {}> = new (...args: any[]) => T;

// Timestamp mixin
export function TimeStamped<TBase extends Constructor>(Base: TBase) {
  return class extends Base {
    timestamp = new Date();
    
    getTimestamp() {
      return this.timestamp;
    }
    
    updateTimestamp() {
      this.timestamp = new Date();
    }
  };
}

// Activatable mixin
export function Activatable<TBase extends Constructor>(Base: TBase) {
  return class extends Base {
    isActive = false;
    
    activate() {
      this.isActive = true;
      return this;
    }
    
    deactivate() {
      this.isActive = false;
      return this;
    }
    
    getStatus() {
      return this.isActive ? 'Active' : 'Inactive';
    }
  };
}

// Serializable mixin
export function Serializable<TBase extends Constructor>(Base: TBase) {
  return class extends Base {
    serialize() {
      return JSON.stringify(this);
    }
    
    static deserialize(json: string) {
      return new Base(...Object.values(JSON.parse(json)));
    }
  };
}
EOL

  cat > $SAMPLE_WORKSPACE/src/mixins/usage.ts << 'EOL'
import { TimeStamped, Activatable, Serializable } from './mixins';

// Base class
class User {
  constructor(public name: string, public email: string) {}
  
  displayInfo() {
    return `${this.name} (${this.email})`;
  }
}

// Apply mixins
const TimestampedUser = TimeStamped(User);
const ActivatableUser = Activatable(User);
const SerializableUser = Serializable(User);

// Multiple mixins
const FullFeaturedUser = Serializable(Activatable(TimeStamped(User)));

// Usage examples
export function demonstrateMixins() {
  const user1 = new TimestampedUser('John', 'john@example.com');
  console.log(`${user1.displayInfo()} created at ${user1.getTimestamp()}`);
  
  const user2 = new ActivatableUser('Jane', 'jane@example.com');
  user2.activate();
  console.log(`${user2.displayInfo()} is ${user2.getStatus()}`);
  
  const user3 = new SerializableUser('Bob', 'bob@example.com');
  const serialized = user3.serialize();
  console.log(`Serialized: ${serialized}`);
  
  const user4 = new FullFeaturedUser('Alice', 'alice@example.com');
  user4.activate();
  user4.updateTimestamp();
  console.log(`${user4.displayInfo()} is ${user4.getStatus()} at ${user4.getTimestamp()}`);
  console.log(`Serialized full featured user: ${user4.serialize()}`);
}
EOL

  echo "Enhanced sample workspace created successfully."
}

# Function to analyze class hierarchy
analyze_class_hierarchy() {
  echo -e "\n--- Class Hierarchy Analysis ---"
  
  echo "Abstract classes:"
  grep -r "abstract class " --include="*.ts" $SAMPLE_WORKSPACE | sort
  
  echo -e "\nClasses that extend other classes:"
  grep -r "extends " --include="*.ts" $SAMPLE_WORKSPACE | sort
  
  echo -e "\nInterfaces:"
  grep -r "interface " --include="*.ts" $SAMPLE_WORKSPACE | sort
  
  echo -e "\nImplementation relationships:"
  grep -r "implements " --include="*.ts" $SAMPLE_WORKSPACE | sort
  
  echo -e "\nMixins:"
  grep -r "function.*<TBase extends" --include="*.ts" $SAMPLE_WORKSPACE | sort
}

# Function to analyze dependency graph
analyze_dependencies() {
  echo -e "\n--- Dependency Graph Analysis ---"
  
  echo "Import statements by file:"
  for file in $(find $SAMPLE_WORKSPACE -name "*.ts" | grep -v "node_modules"); do
    echo -e "\nFile: $(basename $file)"
    grep "import " $file | sort
  done
  
  echo -e "\nPotential circular dependencies:"
  # This is a simplistic check - in reality, the MCP workspace-tracker would do a deeper analysis
  for module in $(grep -r "import " --include="*.ts" $SAMPLE_WORKSPACE | cut -d':' -f1 | sort | uniq); do
    module_name=$(basename $module)
    grep -l $module_name $(grep -l "import " $module) | while read importing_file; do
      if [ "$module" != "$importing_file" ]; then
        echo "Potential circular: $module_name <-> $(basename $importing_file)"
      fi
    done
  done
}

# Main execution
main() {
  echo "=== Phase 2 Feature Test Scenario ==="
  
  # Enhance the sample workspace
  enhance_sample_workspace
  
  # Perform analysis
  analyze_class_hierarchy
  analyze_dependencies
  
  echo -e "\n=== Phase 2 Feature Test Summary ==="
  echo "The enhanced sample workspace now contains:"
  echo "- Complex class hierarchy with abstract classes"
  echo "- Multiple inheritance relationships"
  echo "- Interface implementations"
  echo "- Circular dependencies"
  echo "- Decorator pattern"
  echo "- Mixin pattern"
  echo -e "\nThis provides a comprehensive test bed for Phase 2 features:"
  echo "- ClassHierarchyBuilder"
  echo "- DependencyGraphBuilder"
}

# Execute main function
main
