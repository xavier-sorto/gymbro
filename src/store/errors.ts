export class ValidationError extends Error {
  constructor(readonly field: string, readonly reason: string) {
    super(`${field}: ${reason}`);
    this.name = 'ValidationError';
  }
}

export class NotFoundError extends Error {
  constructor(readonly table: string, readonly id: string) {
    super(`No ${table} record with id ${id}`);
    this.name = 'NotFoundError';
  }
}

export class DuplicateNameError extends Error {
  constructor(readonly existingId: string) {
    super(`An exercise with this name already exists (${existingId}). Use the existing exercise.`);
    this.name = 'DuplicateNameError';
  }
}

export class StorageFullError extends Error {
  constructor(options?: ErrorOptions) {
    super('Your phone is out of storage. Free some space, then tap Retry.', options);
    this.name = 'StorageFullError';
  }
}

export class StoreUnavailableError extends Error {
  constructor(options?: ErrorOptions) {
    super("GymBro can't save data here. Open it from your home screen, not a private tab.", options);
    this.name = 'StoreUnavailableError';
  }
}

export class MigrationError extends Error {
  constructor(readonly fromVersion: number, options?: ErrorOptions) {
    super(`Update couldn't finish. Your data is safe (migration from version ${fromVersion} failed).`, options);
    this.name = 'MigrationError';
  }
}

export class ImportError extends Error {
  constructor(readonly reason: string) {
    super(`Backup import failed: ${reason}`);
    this.name = 'ImportError';
  }
}
