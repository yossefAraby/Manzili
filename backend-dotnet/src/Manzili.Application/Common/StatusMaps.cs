namespace Manzili.Application.Common;

/// <summary>
/// Status enums/maps mirroring the Node backend's utils/statusMaps.js.
/// Integer values match the DB-stored codes exactly.
/// </summary>
public static class StatusMaps
{
    public static readonly IReadOnlyDictionary<int, string> OrderStatus = new Dictionary<int, string>
    {
        [0] = "PENDING_PAYMENT",
        [1] = "ORDER_PLACED",
        [2] = "PROCESSING",
        [3] = "SHIPPED",
        [4] = "DELIVERED",
        [5] = "CANCELED",
        [6] = "RETURNED",
    };

    public static readonly IReadOnlyDictionary<string, int> OrderStatusReverse =
        OrderStatus.ToDictionary(kv => kv.Value, kv => kv.Key);

    public static readonly IReadOnlyDictionary<int, string> PaymentMethod = new Dictionary<int, string>
    {
        [0] = "COD",
        [1] = "STRIPE",
    };

    public static readonly IReadOnlyDictionary<string, int> PaymentMethodReverse =
        PaymentMethod.ToDictionary(kv => kv.Value, kv => kv.Key);

    public static readonly IReadOnlyDictionary<int, string> PaymentStatus = new Dictionary<int, string>
    {
        [0] = "PENDING",
        [1] = "PAID",
        [2] = "FAILED",
        [3] = "REFUNDED",
    };

    public static readonly IReadOnlyDictionary<int, string> ShipmentStatus = new Dictionary<int, string>
    {
        [0] = "CREATED",
        [1] = "PICKED_UP",
        [2] = "IN_TRANSIT",
        [3] = "DELIVERED",
        [4] = "FAILED",
        [5] = "CANCELED",
        [6] = "UNKNOWN",
    };

    // Return lifecycle (stored in manzili.returns.status as a smallint).
    // A return now starts PENDING_APPROVAL and only triggers the reverse Bosta pickup,
    // refund and seller wallet reversal once an admin APPROVES it.
    public static readonly IReadOnlyDictionary<int, string> ReturnStatus = new Dictionary<int, string>
    {
        [0] = "PENDING_APPROVAL",
        [1] = "APPROVED",
        [2] = "REJECTED",
    };

    public static class ReturnStatusCode
    {
        public const short PendingApproval = 0;
        public const short Approved = 1;
        public const short Rejected = 2;
    }

    // DB check constraint: scope IN (0, 10, 11, 20, 21)
    public static readonly IReadOnlyDictionary<int, string> CouponScope = new Dictionary<int, string>
    {
        [0] = "GLOBAL",
        [10] = "STORE",
        [11] = "STORE",
        [20] = "PRODUCTS",
        [21] = "PRODUCTS",
    };

    // Canonical values for creating coupons
    public static readonly IReadOnlyDictionary<string, int> CouponScopeCreate = new Dictionary<string, int>
    {
        ["GLOBAL"] = 0,
        ["STORE"] = 10,
        ["PRODUCTS"] = 20,
    };

    public static class StoreStatus
    {
        public const string Pending = "pending";
        public const string Approved = "approved";
        public const string Rejected = "rejected";
    }
}
