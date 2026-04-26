import { ApiError } from "@/lib/api";

type StringFieldOptions = {
  field: string;
  required?: boolean;
  minLength?: number;
  maxLength?: number;
};

type NumberFieldOptions = {
  field: string;
  required?: boolean;
  min?: number;
  max?: number;
  integer?: boolean;
};

export function requireObject(value: unknown, field = "body") {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    throw new ApiError(400, "INVALID_INPUT", `${field} must be a JSON object.`);
  }

  return value as Record<string, unknown>;
}

export function parseString(value: unknown, options: StringFieldOptions) {
  const { field, required = false, minLength, maxLength } = options;

  if (value == null || value === "") {
    if (required) {
      throw new ApiError(400, "INVALID_INPUT", `${field} is required.`);
    }

    return undefined;
  }

  if (typeof value !== "string") {
    throw new ApiError(400, "INVALID_INPUT", `${field} must be a string.`);
  }

  const trimmedValue = value.trim();

  if (required && trimmedValue.length === 0) {
    throw new ApiError(400, "INVALID_INPUT", `${field} is required.`);
  }

  if (minLength && trimmedValue.length < minLength) {
    throw new ApiError(
      400,
      "INVALID_INPUT",
      `${field} must be at least ${minLength} characters.`,
    );
  }

  if (maxLength && trimmedValue.length > maxLength) {
    throw new ApiError(
      400,
      "INVALID_INPUT",
      `${field} must be at most ${maxLength} characters.`,
    );
  }

  return trimmedValue;
}

export function parseNumber(value: unknown, options: NumberFieldOptions) {
  const { field, required = false, min, max, integer = false } = options;

  if (value == null || value === "") {
    if (required) {
      throw new ApiError(400, "INVALID_INPUT", `${field} is required.`);
    }

    return undefined;
  }

  if (typeof value !== "number" || Number.isNaN(value)) {
    throw new ApiError(400, "INVALID_INPUT", `${field} must be a number.`);
  }

  if (integer && !Number.isInteger(value)) {
    throw new ApiError(400, "INVALID_INPUT", `${field} must be an integer.`);
  }

  if (min != null && value < min) {
    throw new ApiError(400, "INVALID_INPUT", `${field} must be at least ${min}.`);
  }

  if (max != null && value > max) {
    throw new ApiError(400, "INVALID_INPUT", `${field} must be at most ${max}.`);
  }

  return value;
}

export function parseBoolean(value: unknown, field: string) {
  if (value == null) {
    return undefined;
  }

  if (typeof value !== "boolean") {
    throw new ApiError(400, "INVALID_INPUT", `${field} must be a boolean.`);
  }

  return value;
}
