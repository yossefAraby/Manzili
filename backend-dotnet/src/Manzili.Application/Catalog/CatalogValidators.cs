using FluentValidation;

namespace Manzili.Application.Catalog;

public sealed class StoreApplyRequestValidator : AbstractValidator<StoreApplyRequest>
{
    public StoreApplyRequestValidator()
    {
        RuleFor(x => x.Name).NotEmpty();
    }
}

public sealed class CreateRatingRequestValidator : AbstractValidator<CreateRatingRequest>
{
    public CreateRatingRequestValidator()
    {
        RuleFor(x => x.ProductId).NotEmpty();
        RuleFor(x => x.Rating).InclusiveBetween(1, 5);
    }
}
