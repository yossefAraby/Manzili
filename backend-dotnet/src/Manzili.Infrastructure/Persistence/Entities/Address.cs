using System;
using System.Collections.Generic;

namespace Manzili.Infrastructure.Persistence.Entities;

public partial class Address
{
    public int Id { get; set; }

    public string? City { get; set; }

    public string? Street { get; set; }

    public string? Buildingnumber { get; set; }

    public string? Apartmentnumber { get; set; }

    public string? Zipcode { get; set; }

    public int? Personid { get; set; }

    public string? Name { get; set; }

    public string? Email { get; set; }

    public string? Phone { get; set; }

    public string? Zone { get; set; }

    public string? District { get; set; }

    public string? Floor { get; set; }

    public string? Postalcode { get; set; }

    public string? BostaCityId { get; set; }

    public string? BostaZoneId { get; set; }

    public string? BostaDistrictId { get; set; }

    public virtual ICollection<AddressesAndContactPhonenumber> AddressesAndContactPhonenumbers { get; set; } = new List<AddressesAndContactPhonenumber>();

    public virtual ICollection<OfferPayment> OfferPayments { get; set; } = new List<OfferPayment>();

    public virtual ICollection<Order> Orders { get; set; } = new List<Order>();

    public virtual Person? Person { get; set; }
}
