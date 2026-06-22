using FluentValidation;

namespace Manzili.Application.Custom;

/// <summary>
/// Shape guards for creating a custom request. The Node createRequest requires
/// itemName + description to persist (non-null columns), so enforce those here.
/// </summary>
public sealed class CreateCustomRequestRequestValidator : AbstractValidator<CreateCustomRequestRequest>
{
    public CreateCustomRequestRequestValidator()
    {
        RuleFor(x => x.ItemName).NotEmpty();
        RuleFor(x => x.Description).NotEmpty();
        RuleFor(x => x.Visibility)
            .Must(v => v is null || v == "open" || v == "private")
            .WithMessage("visibility must be 'open' or 'private'");
    }
}

public sealed class SendOfferMessageRequestValidator : AbstractValidator<SendOfferMessageRequest>
{
    public SendOfferMessageRequestValidator()
    {
        RuleFor(x => x.Text).NotEmpty();
    }
}

public sealed class SubmitOfferRequestValidator : AbstractValidator<SubmitOfferRequest>
{
    public SubmitOfferRequestValidator()
    {
        RuleFor(x => x.Price).GreaterThan(0);
    }
}

public sealed class OfferActionRequestValidator : AbstractValidator<OfferActionRequest>
{
    private static readonly string[] Allowed = ["accept", "decline", "block", "progress", "ready"];

    public OfferActionRequestValidator()
    {
        RuleFor(x => x.Action)
            .Must(a => a is not null && Allowed.Contains(a))
            .WithMessage("action must be one of: accept, decline, block, progress, ready");
    }
}

public sealed class OfferPaymentRequestValidator : AbstractValidator<OfferPaymentRequest>
{
    private static readonly string[] Allowed = ["first", "second", "final"];

    public OfferPaymentRequestValidator()
    {
        RuleFor(x => x.Milestone)
            .Must(m => m is not null && Allowed.Contains(m))
            .WithMessage("milestone must be one of: first, second, final");
        RuleFor(x => x.Amount).GreaterThan(0);
        RuleFor(x => x.PaymentMethod).NotEmpty();
    }
}
