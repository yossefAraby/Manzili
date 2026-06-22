namespace Manzili.Application.Common;

/// <summary>
/// Base operational error carrying an HTTP status code and a machine-readable code.
/// Mirrors the Node backend's utils/errors.js AppError hierarchy.
/// </summary>
public class AppException : Exception
{
    public int StatusCode { get; }
    public string Code { get; }
    public object? Details { get; }

    public AppException(string message, int statusCode = 500, string code = "INTERNAL_ERROR", object? details = null)
        : base(message)
    {
        StatusCode = statusCode;
        Code = code;
        Details = details;
    }
}

public sealed class NotFoundException : AppException
{
    public NotFoundException(string resource = "Resource")
        : base($"{resource} not found", 404, "NOT_FOUND") { }
}

public sealed class ValidationAppException : AppException
{
    public ValidationAppException(object details)
        : base("Validation failed", 400, "VALIDATION_ERROR", details) { }
}

public sealed class ForbiddenException : AppException
{
    public ForbiddenException(string message = "Forbidden")
        : base(message, 403, "FORBIDDEN") { }
}

public sealed class ConflictException : AppException
{
    public ConflictException(string message = "Resource already exists")
        : base(message, 409, "CONFLICT") { }
}

public sealed class UnauthorizedException : AppException
{
    public UnauthorizedException(string message = "Unauthorized")
        : base(message, 401, "UNAUTHORIZED") { }
}
