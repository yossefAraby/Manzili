using System;
using System.Collections.Generic;

namespace Manzili.Infrastructure.Persistence.Entities;

public partial class AddressesAndContactPhonenumber
{
    public string Phonenumber { get; set; } = null!;

    public int Addressid { get; set; }

    public virtual Address Address { get; set; } = null!;
}
