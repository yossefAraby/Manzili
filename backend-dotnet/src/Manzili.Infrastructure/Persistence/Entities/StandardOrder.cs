using System;
using System.Collections.Generic;

namespace Manzili.Infrastructure.Persistence.Entities;

public partial class StandardOrder
{
    public int Orderid { get; set; }

    public virtual Order Order { get; set; } = null!;
}
