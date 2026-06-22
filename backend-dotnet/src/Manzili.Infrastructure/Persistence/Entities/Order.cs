using System;
using System.Collections.Generic;

namespace Manzili.Infrastructure.Persistence.Entities;

public partial class Order
{
    public int Orderid { get; set; }

    public short? Status { get; set; }

    public decimal? Shippingcost { get; set; }

    public decimal? Totalamount { get; set; }

    public int Paymentid { get; set; }

    public short? Paymentmethod { get; set; }

    public string? Psp { get; set; }

    public short? Paymentstatus { get; set; }

    public string? TransactionRef { get; set; }

    public DateTime PaidAt { get; set; }

    public int? Shipmentid { get; set; }

    public int? Sellerid { get; set; }

    public int? Enduserid { get; set; }

    public string? StripePaymentIntentId { get; set; }

    public bool? IsPaid { get; set; }

    public int? AddressId { get; set; }

    public string? CouponSnapshot { get; set; }

    public DateTime? CreatedAt { get; set; }

    public virtual Address? Address { get; set; }

    public virtual ICollection<ConsistOf> ConsistOfs { get; set; } = new List<ConsistOf>();

    public virtual CustomizedOrder? CustomizedOrder { get; set; }

    public virtual Enduser? Enduser { get; set; }

    public virtual ICollection<Return> Returns { get; set; } = new List<Return>();

    public virtual Seller? Seller { get; set; }

    public virtual Shipment? Shipment { get; set; }

    public virtual StandardOrder? StandardOrder { get; set; }

    public virtual ICollection<StoreOrder> StoreOrders { get; set; } = new List<StoreOrder>();

    public virtual ICollection<UserCoupon> UserCoupons { get; set; } = new List<UserCoupon>();
}
