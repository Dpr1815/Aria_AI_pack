export interface ApiErrorBody {
  success: false;
  error: {
    code: string;
    message: string;
    requestId?: string;
  };
}

export function getErrorMessage(error: unknown): string {
  if (!error) return "An unknown error occurred";

  // 1. Axios-style: error.response.data.error.message
  if (typeof error === "object" && error !== null && "response" in error) {
    const res = (error as { response?: { data?: unknown } }).response;
    if (res?.data && isApiErrorBody(res.data)) {
      return res.data.error.message;
    }
  }

  // 2. Direct BE envelope (e.g. fetch .json() result)
  if (isApiErrorBody(error)) {
    return error.error.message;
  }

  // 3. Standard Error
  if (error instanceof Error) {
    return error.message;
  }

  if (typeof error === "string") return error;

  return "An unknown error occurred";
}

function isApiErrorBody(val: unknown): val is ApiErrorBody {
  return (
    typeof val === "object" &&
    val !== null &&
    "success" in val &&
    (val as ApiErrorBody).success === false &&
    "error" in val &&
    typeof (val as ApiErrorBody).error?.message === "string"
  );
}
