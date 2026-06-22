using System;
using System.Collections.Generic;

namespace Manzili.Infrastructure.Persistence.Entities;

public partial class Systemadmin
{
    public int Adminid { get; set; }

    public int? Supervisorid { get; set; }

    public int Personid { get; set; }

    public virtual ICollection<Systemadmin> InverseSupervisor { get; set; } = new List<Systemadmin>();

    public virtual Person Person { get; set; } = null!;

    public virtual Systemadmin? Supervisor { get; set; }
}
