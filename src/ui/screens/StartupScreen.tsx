import { DataNewerThanAppError, MigrationError, StoreUnavailableError } from '../../store';

export function LoadingScreen() {
  return (
    <div class="splash">
      <h1>GymBro</h1>
    </div>
  );
}

function startupAdvice(error: Error): string {
  if (error instanceof StoreUnavailableError || error instanceof MigrationError || error instanceof DataNewerThanAppError) {
    return error.message;
  }
  return "GymBro couldn't start. Close the app and open it again; if it keeps happening, your data is still on this phone.";
}

export function StartupErrorScreen({ error }: { error: Error }) {
  return (
    <div class="splash" role="alert">
      <h1>GymBro</h1>
      <p>{startupAdvice(error)}</p>
    </div>
  );
}
