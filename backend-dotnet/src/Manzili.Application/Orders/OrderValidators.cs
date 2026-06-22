using FluentValidation;

namespace Manzili.Application.Orders;

/// <summary>
/// Light validation for order creation. The Node service performs the substantive
/// checks (address ownership, payment method, product existence/stock) at runtime and
/// throws ValidationError; we keep those in the service. This guards obvious shape errors.
/// </summary>
public sealed class CreateOrderRequestValidator : AbstractValidator<CreateOrderRequest>
{
    public CreateOrderRequestValidator()
    {
        RuleFor(x => x.Items).NotNull().NotEmpty();
        RuleForEach(x => x.Items).ChildRules(item =>
        {
            item.RuleFor(i => i.ProductId).NotEmpty();
            item.RuleFor(i => i.Quantity).GreaterThan(0);
        });
        RuleFor(x => x.AddressId).NotEmpty();
        RuleFor(x => x.PaymentMethod).NotEmpty();
    }
}
