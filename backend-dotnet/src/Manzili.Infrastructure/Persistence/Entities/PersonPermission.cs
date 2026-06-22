using System;
using System.Collections.Generic;

namespace Manzili.Infrastructure.Persistence.Entities;

public partial class PersonPermission
{
    public int Permission { get; set; }

    public int Personid { get; set; }

    public virtual Person Person { get; set; } = null!;
}
