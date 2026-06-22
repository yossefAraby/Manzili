using System;
using System.Collections.Generic;
using Manzili.Infrastructure.Persistence.Entities;
using Microsoft.EntityFrameworkCore;

namespace Manzili.Infrastructure.Persistence;

public partial class ManziliDbContext : DbContext
{
    public ManziliDbContext(DbContextOptions<ManziliDbContext> options)
        : base(options)
    {
    }

    public virtual DbSet<Address> Addresses { get; set; }

    public virtual DbSet<AddressesAndContactPhonenumber> AddressesAndContactPhonenumbers { get; set; }

    public virtual DbSet<BostaAddressMapping> BostaAddressMappings { get; set; }

    public virtual DbSet<Cart> Carts { get; set; }

    public virtual DbSet<CartContain> CartContains { get; set; }

    public virtual DbSet<Category> Categories { get; set; }

    public virtual DbSet<ColorPalette> ColorPalettes { get; set; }

    public virtual DbSet<ConsistOf> ConsistOfs { get; set; }

    public virtual DbSet<Conversation> Conversations { get; set; }

    public virtual DbSet<Coupon> Coupons { get; set; }

    public virtual DbSet<CouponProduct> CouponProducts { get; set; }

    public virtual DbSet<CustomRequest> CustomRequests { get; set; }

    public virtual DbSet<CustomizedOrder> CustomizedOrders { get; set; }

    public virtual DbSet<Enduser> Endusers { get; set; }

    public virtual DbSet<Follow> Follows { get; set; }

    public virtual DbSet<Message> Messages { get; set; }

    public virtual DbSet<Notification> Notifications { get; set; }

    public virtual DbSet<Offer> Offers { get; set; }

    public virtual DbSet<OfferMessage> OfferMessages { get; set; }

    public virtual DbSet<OfferPayment> OfferPayments { get; set; }

    public virtual DbSet<Order> Orders { get; set; }

    public virtual DbSet<Payout> Payouts { get; set; }

    public virtual DbSet<Person> People { get; set; }

    public virtual DbSet<PersonPermission> PersonPermissions { get; set; }

    public virtual DbSet<Product> Products { get; set; }

    public virtual DbSet<ProductImage> ProductImages { get; set; }

    public virtual DbSet<ProductVariant> ProductVariants { get; set; }

    public virtual DbSet<ProofAsImage> ProofAsImages { get; set; }

    public virtual DbSet<Report> Reports { get; set; }

    public virtual DbSet<Return> Returns { get; set; }

    public virtual DbSet<ReviewingAndRating> ReviewingAndRatings { get; set; }

    public virtual DbSet<Seller> Sellers { get; set; }

    public virtual DbSet<SellerWallet> SellerWallets { get; set; }

    public virtual DbSet<Shipment> Shipments { get; set; }

    public virtual DbSet<ShipmentEvent> ShipmentEvents { get; set; }

    public virtual DbSet<StandardOrder> StandardOrders { get; set; }

    public virtual DbSet<StoreOrder> StoreOrders { get; set; }

    public virtual DbSet<StoreOrderItem> StoreOrderItems { get; set; }

    public virtual DbSet<StorePickupAddress> StorePickupAddresses { get; set; }

    public virtual DbSet<Systemadmin> Systemadmins { get; set; }

    public virtual DbSet<UserCoupon> UserCoupons { get; set; }

    public virtual DbSet<VariantOption> VariantOptions { get; set; }

    public virtual DbSet<VisualInspiration> VisualInspirations { get; set; }

    public virtual DbSet<Voicememo> Voicememos { get; set; }

    public virtual DbSet<WalletTransaction> WalletTransactions { get; set; }

    public virtual DbSet<Wishlist> Wishlists { get; set; }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder
            .HasPostgresEnum("auth", "aal_level", new[] { "aal1", "aal2", "aal3" })
            .HasPostgresEnum("auth", "code_challenge_method", new[] { "s256", "plain" })
            .HasPostgresEnum("auth", "factor_status", new[] { "unverified", "verified" })
            .HasPostgresEnum("auth", "factor_type", new[] { "totp", "webauthn", "phone" })
            .HasPostgresEnum("auth", "oauth_authorization_status", new[] { "pending", "approved", "denied", "expired" })
            .HasPostgresEnum("auth", "oauth_client_type", new[] { "public", "confidential" })
            .HasPostgresEnum("auth", "oauth_registration_type", new[] { "dynamic", "manual" })
            .HasPostgresEnum("auth", "oauth_response_type", new[] { "code" })
            .HasPostgresEnum("auth", "one_time_token_type", new[] { "confirmation_token", "reauthentication_token", "recovery_token", "email_change_token_new", "email_change_token_current", "phone_change_token" })
            .HasPostgresEnum("realtime", "action", new[] { "INSERT", "UPDATE", "DELETE", "TRUNCATE", "ERROR" })
            .HasPostgresEnum("realtime", "equality_op", new[] { "eq", "neq", "lt", "lte", "gt", "gte", "in" })
            .HasPostgresEnum("storage", "buckettype", new[] { "STANDARD", "ANALYTICS", "VECTOR" })
            .HasPostgresExtension("extensions", "pg_stat_statements")
            .HasPostgresExtension("extensions", "pgcrypto")
            .HasPostgresExtension("extensions", "uuid-ossp")
            .HasPostgresExtension("vault", "supabase_vault");

        modelBuilder.Entity<Address>(entity =>
        {
            entity.HasKey(e => e.Id).HasName("addresses_pkey");

            entity.ToTable("addresses", "manzili");

            entity.Property(e => e.Id).HasColumnName("id");
            entity.Property(e => e.Apartmentnumber)
                .HasMaxLength(20)
                .HasColumnName("apartmentnumber");
            entity.Property(e => e.BostaCityId)
                .HasMaxLength(50)
                .HasColumnName("bosta_city_id");
            entity.Property(e => e.BostaDistrictId)
                .HasMaxLength(50)
                .HasColumnName("bosta_district_id");
            entity.Property(e => e.BostaZoneId)
                .HasMaxLength(50)
                .HasColumnName("bosta_zone_id");
            entity.Property(e => e.Buildingnumber)
                .HasMaxLength(20)
                .HasColumnName("buildingnumber");
            entity.Property(e => e.City)
                .HasMaxLength(50)
                .HasColumnName("city");
            entity.Property(e => e.District)
                .HasMaxLength(100)
                .HasColumnName("district");
            entity.Property(e => e.Email)
                .HasMaxLength(100)
                .HasColumnName("email");
            entity.Property(e => e.Floor)
                .HasMaxLength(20)
                .HasColumnName("floor");
            entity.Property(e => e.Name)
                .HasMaxLength(100)
                .HasColumnName("name");
            entity.Property(e => e.Personid).HasColumnName("personid");
            entity.Property(e => e.Phone)
                .HasMaxLength(20)
                .HasColumnName("phone");
            entity.Property(e => e.Postalcode)
                .HasMaxLength(20)
                .HasColumnName("postalcode");
            entity.Property(e => e.Street)
                .HasMaxLength(100)
                .HasColumnName("street");
            entity.Property(e => e.Zipcode)
                .HasMaxLength(20)
                .HasColumnName("zipcode");
            entity.Property(e => e.Zone)
                .HasMaxLength(100)
                .HasColumnName("zone");

            entity.HasOne(d => d.Person).WithMany(p => p.Addresses)
                .HasForeignKey(d => d.Personid)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("addresses_personid_fkey");
        });

        modelBuilder.Entity<AddressesAndContactPhonenumber>(entity =>
        {
            entity.HasKey(e => new { e.Phonenumber, e.Addressid }).HasName("addresses_and_contact_phonenumber_pkey");

            entity.ToTable("addresses_and_contact_phonenumber", "manzili");

            entity.Property(e => e.Phonenumber)
                .HasMaxLength(20)
                .HasColumnName("phonenumber");
            entity.Property(e => e.Addressid).HasColumnName("addressid");

            entity.HasOne(d => d.Address).WithMany(p => p.AddressesAndContactPhonenumbers)
                .HasForeignKey(d => d.Addressid)
                .HasConstraintName("addresses_and_contact_phonenumber_addressid_fkey");
        });

        modelBuilder.Entity<BostaAddressMapping>(entity =>
        {
            entity.HasKey(e => e.MappingId).HasName("bosta_address_mapping_pkey");

            entity.ToTable("bosta_address_mapping", "manzili");

            entity.HasIndex(e => new { e.Country, e.CityName }, "bosta_address_mapping_country_city_name_idx");

            entity.Property(e => e.MappingId).HasColumnName("mapping_id");
            entity.Property(e => e.CityId)
                .HasMaxLength(50)
                .HasColumnName("city_id");
            entity.Property(e => e.CityName)
                .HasMaxLength(100)
                .HasColumnName("city_name");
            entity.Property(e => e.Country)
                .HasMaxLength(10)
                .HasColumnName("country");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("timestamp(6) without time zone")
                .HasColumnName("created_at");
            entity.Property(e => e.DistrictId)
                .HasMaxLength(50)
                .HasColumnName("district_id");
            entity.Property(e => e.DistrictName)
                .HasMaxLength(100)
                .HasColumnName("district_name");
            entity.Property(e => e.UpdatedAt)
                .HasColumnType("timestamp(3) without time zone")
                .HasColumnName("updated_at");
            entity.Property(e => e.ZoneId)
                .HasMaxLength(50)
                .HasColumnName("zone_id");
            entity.Property(e => e.ZoneName)
                .HasMaxLength(100)
                .HasColumnName("zone_name");
        });

        modelBuilder.Entity<Cart>(entity =>
        {
            entity.HasKey(e => e.Cartid).HasName("cart_pkey");

            entity.ToTable("cart", "manzili");

            entity.Property(e => e.Cartid).HasColumnName("cartid");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("timestamp(6) without time zone")
                .HasColumnName("created_at");
            entity.Property(e => e.Creatorid).HasColumnName("creatorid");

            entity.HasOne(d => d.Creator).WithMany(p => p.Carts)
                .HasForeignKey(d => d.Creatorid)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("cart_creatorid_fkey");
        });

        modelBuilder.Entity<CartContain>(entity =>
        {
            entity.HasKey(e => new { e.Cartid, e.Productid }).HasName("cart_contain_pkey");

            entity.ToTable("cart_contain", "manzili");

            entity.Property(e => e.Cartid).HasColumnName("cartid");
            entity.Property(e => e.Productid).HasColumnName("productid");
            entity.Property(e => e.NumberOfProducts)
                .HasDefaultValue(0)
                .HasColumnName("number_of_products");

            entity.HasOne(d => d.Cart).WithMany(p => p.CartContains)
                .HasForeignKey(d => d.Cartid)
                .HasConstraintName("cart_contain_cartid_fkey");

            entity.HasOne(d => d.Product).WithMany(p => p.CartContains)
                .HasForeignKey(d => d.Productid)
                .HasConstraintName("cart_contain_productid_fkey");
        });

        modelBuilder.Entity<Category>(entity =>
        {
            entity.HasKey(e => e.Categoryid).HasName("category_pkey");

            entity.ToTable("category", "manzili");

            entity.Property(e => e.Categoryid).HasColumnName("categoryid");
            entity.Property(e => e.CategoryName)
                .HasMaxLength(25)
                .HasColumnName("category_name");
        });

        modelBuilder.Entity<ColorPalette>(entity =>
        {
            entity.HasKey(e => new { e.ColorPaletteid, e.Requestid }).HasName("color_palette_pkey");

            entity.ToTable("color_palette", "manzili");

            entity.Property(e => e.ColorPaletteid)
                .ValueGeneratedOnAdd()
                .HasColumnName("color_paletteid");
            entity.Property(e => e.Requestid).HasColumnName("requestid");
            entity.Property(e => e.ColorCode)
                .HasMaxLength(20)
                .HasColumnName("color_code");
            entity.Property(e => e.ColorDescription)
                .HasMaxLength(100)
                .HasColumnName("color_description");

            entity.HasOne(d => d.Request).WithMany(p => p.ColorPalettes)
                .HasForeignKey(d => d.Requestid)
                .HasConstraintName("color_palette_requestid_fkey");
        });

        modelBuilder.Entity<ConsistOf>(entity =>
        {
            entity.HasKey(e => new { e.Orderid, e.Productid }).HasName("consist_of_pkey");

            entity.ToTable("consist_of", "manzili");

            entity.Property(e => e.Orderid).HasColumnName("orderid");
            entity.Property(e => e.Productid).HasColumnName("productid");
            entity.Property(e => e.PriceAtPurchase)
                .HasPrecision(12, 2)
                .HasColumnName("price_at_purchase");
            entity.Property(e => e.Quantity).HasColumnName("quantity");

            entity.HasOne(d => d.Order).WithMany(p => p.ConsistOfs)
                .HasForeignKey(d => d.Orderid)
                .HasConstraintName("consist_of_orderid_fkey");

            entity.HasOne(d => d.Product).WithMany(p => p.ConsistOfs)
                .HasForeignKey(d => d.Productid)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("consist_of_productid_fkey");
        });

        modelBuilder.Entity<Conversation>(entity =>
        {
            entity.HasKey(e => e.Conversationid).HasName("conversation_pkey");

            entity.ToTable("conversation", "manzili");

            entity.Property(e => e.Conversationid).HasColumnName("conversationid");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("timestamp(6) without time zone")
                .HasColumnName("created_at");
            entity.Property(e => e.Enduserid).HasColumnName("enduserid");
            entity.Property(e => e.Lastmessageat)
                .HasColumnType("timestamp(6) without time zone")
                .HasColumnName("lastmessageat");
            entity.Property(e => e.Sellerid).HasColumnName("sellerid");

            entity.HasOne(d => d.Enduser).WithMany(p => p.Conversations)
                .HasForeignKey(d => d.Enduserid)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("conversation_enduserid_fkey");

            entity.HasOne(d => d.Seller).WithMany(p => p.Conversations)
                .HasForeignKey(d => d.Sellerid)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("conversation_sellerid_fkey");
        });

        modelBuilder.Entity<Coupon>(entity =>
        {
            entity.HasKey(e => e.Couponid).HasName("coupons_pkey");

            entity.ToTable("coupons", "manzili");

            entity.HasIndex(e => e.Code, "coupons_code_key").IsUnique();

            entity.Property(e => e.Couponid).HasColumnName("couponid");
            entity.Property(e => e.Code)
                .HasMaxLength(50)
                .HasColumnName("code");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("timestamp(6) without time zone")
                .HasColumnName("created_at");
            entity.Property(e => e.Creatorid).HasColumnName("creatorid");
            entity.Property(e => e.Description)
                .HasMaxLength(500)
                .HasColumnName("description");
            entity.Property(e => e.DiscountPercentage)
                .HasPrecision(5, 2)
                .HasColumnName("discount_percentage");
            entity.Property(e => e.ExpiredDate)
                .HasColumnType("timestamp(6) without time zone")
                .HasColumnName("expired_date");
            entity.Property(e => e.MaxUsers)
                .HasDefaultValue(100)
                .HasColumnName("max_users");
            entity.Property(e => e.Scope).HasColumnName("scope");
            entity.Property(e => e.Status)
                .HasDefaultValue(true)
                .HasColumnName("status");
            entity.Property(e => e.Storeid).HasColumnName("storeid");
            entity.Property(e => e.UsedCount)
                .HasDefaultValue(0)
                .HasColumnName("used_count");

            entity.HasOne(d => d.Creator).WithMany(p => p.Coupons)
                .HasForeignKey(d => d.Creatorid)
                .HasConstraintName("coupons_creatorid_fkey");

            entity.HasOne(d => d.Store).WithMany(p => p.Coupons)
                .HasForeignKey(d => d.Storeid)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("coupons_storeid_fkey");
        });

        modelBuilder.Entity<CouponProduct>(entity =>
        {
            entity.HasKey(e => e.CouponProductid).HasName("coupon_product_pkey");

            entity.ToTable("coupon_product", "manzili");

            entity.Property(e => e.CouponProductid).HasColumnName("coupon_productid");
            entity.Property(e => e.Couponid).HasColumnName("couponid");
            entity.Property(e => e.Productid).HasColumnName("productid");

            entity.HasOne(d => d.Coupon).WithMany(p => p.CouponProducts)
                .HasForeignKey(d => d.Couponid)
                .HasConstraintName("coupon_product_couponid_fkey");

            entity.HasOne(d => d.Product).WithMany(p => p.CouponProducts)
                .HasForeignKey(d => d.Productid)
                .HasConstraintName("coupon_product_productid_fkey");
        });

        modelBuilder.Entity<CustomRequest>(entity =>
        {
            entity.HasKey(e => e.Requestid).HasName("custom_request_pkey");

            entity.ToTable("custom_request", "manzili");

            entity.Property(e => e.Requestid).HasColumnName("requestid");
            entity.Property(e => e.Categoryid).HasColumnName("categoryid");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_DATE")
                .HasColumnName("created_at");
            entity.Property(e => e.Description)
                .HasMaxLength(1000)
                .HasColumnName("description");
            entity.Property(e => e.DesiredDeliveryDate).HasColumnName("desired_delivery_date");
            entity.Property(e => e.Enduserid).HasColumnName("enduserid");
            entity.Property(e => e.Hight).HasColumnName("hight");
            entity.Property(e => e.ImageUrls).HasColumnName("image_urls");
            entity.Property(e => e.Itemname)
                .HasMaxLength(100)
                .HasColumnName("itemname");
            entity.Property(e => e.Lenght).HasColumnName("lenght");
            entity.Property(e => e.Matrial)
                .HasMaxLength(255)
                .HasColumnName("matrial");
            entity.Property(e => e.Quantity)
                .HasDefaultValue((short)1)
                .HasColumnName("quantity");
            entity.Property(e => e.Sellerid).HasColumnName("sellerid");
            entity.Property(e => e.Status).HasColumnName("status");
            entity.Property(e => e.Visibility)
                .HasDefaultValue(true)
                .HasColumnName("visibility");
            entity.Property(e => e.VoicememoUrl)
                .HasMaxLength(500)
                .HasColumnName("voicememo_url");
            entity.Property(e => e.Width).HasColumnName("width");

            entity.HasOne(d => d.Category).WithMany(p => p.CustomRequests)
                .HasForeignKey(d => d.Categoryid)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("custom_request_categoryid_fkey");

            entity.HasOne(d => d.Enduser).WithMany(p => p.CustomRequests)
                .HasForeignKey(d => d.Enduserid)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("custom_request_enduserid_fkey");

            entity.HasOne(d => d.Seller).WithMany(p => p.CustomRequests)
                .HasForeignKey(d => d.Sellerid)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("custom_request_sellerid_fkey");
        });

        modelBuilder.Entity<CustomizedOrder>(entity =>
        {
            entity.HasKey(e => e.Orderid).HasName("customized_order_pkey");

            entity.ToTable("customized_order", "manzili");

            entity.Property(e => e.Orderid)
                .ValueGeneratedNever()
                .HasColumnName("orderid");

            entity.HasOne(d => d.Order).WithOne(p => p.CustomizedOrder)
                .HasForeignKey<CustomizedOrder>(d => d.Orderid)
                .HasConstraintName("customized_order_orderid_fkey");
        });

        modelBuilder.Entity<Enduser>(entity =>
        {
            entity.HasKey(e => e.Enduserid).HasName("enduser_pkey");

            entity.ToTable("enduser", "manzili");

            entity.HasIndex(e => e.Personid, "enduser_personid_key").IsUnique();

            entity.Property(e => e.Enduserid).HasColumnName("enduserid");
            entity.Property(e => e.Personid).HasColumnName("personid");
            entity.Property(e => e.Wichlistid).HasColumnName("wichlistid");

            entity.HasOne(d => d.Person).WithOne(p => p.Enduser)
                .HasForeignKey<Enduser>(d => d.Personid)
                .HasConstraintName("enduser_personid_fkey");

            entity.HasOne(d => d.Wichlist).WithMany(p => p.Endusers)
                .HasForeignKey(d => d.Wichlistid)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("enduser_wichlistid_fkey");
        });

        modelBuilder.Entity<Follow>(entity =>
        {
            entity.HasKey(e => new { e.Enduserid, e.Sellerid }).HasName("follow_pkey");

            entity.ToTable("follow", "manzili");

            entity.Property(e => e.Enduserid).HasColumnName("enduserid");
            entity.Property(e => e.Sellerid).HasColumnName("sellerid");
            entity.Property(e => e.FollowedAt)
                .HasDefaultValueSql("CURRENT_DATE")
                .HasColumnName("followed_at");

            entity.HasOne(d => d.Enduser).WithMany(p => p.Follows)
                .HasForeignKey(d => d.Enduserid)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("follow_enduserid_fkey");

            entity.HasOne(d => d.Seller).WithMany(p => p.Follows)
                .HasForeignKey(d => d.Sellerid)
                .HasConstraintName("follow_sellerid_fkey");
        });

        modelBuilder.Entity<Message>(entity =>
        {
            entity.HasKey(e => new { e.Messageid, e.Conversationid }).HasName("messages_pkey");

            entity.ToTable("messages", "manzili");

            entity.Property(e => e.Messageid)
                .ValueGeneratedOnAdd()
                .HasColumnName("messageid");
            entity.Property(e => e.Conversationid).HasColumnName("conversationid");
            entity.Property(e => e.Isread)
                .HasDefaultValue(false)
                .HasColumnName("isread");
            entity.Property(e => e.Messagecontent).HasColumnName("messagecontent");
            entity.Property(e => e.SentAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("timestamp(5) without time zone")
                .HasColumnName("sent_at");

            entity.HasOne(d => d.Conversation).WithMany(p => p.Messages)
                .HasForeignKey(d => d.Conversationid)
                .HasConstraintName("messages_conversationid_fkey");
        });

        modelBuilder.Entity<Notification>(entity =>
        {
            entity.HasKey(e => e.NotificationId).HasName("notification_pkey");

            entity.ToTable("notification", "manzili");

            entity.Property(e => e.NotificationId).HasColumnName("notification_id");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("timestamp(6) without time zone")
                .HasColumnName("created_at");
            entity.Property(e => e.Href)
                .HasMaxLength(500)
                .HasColumnName("href");
            entity.Property(e => e.IsRead)
                .HasDefaultValue(false)
                .HasColumnName("is_read");
            entity.Property(e => e.Notificationcontent)
                .HasMaxLength(700)
                .HasColumnName("notificationcontent");
            entity.Property(e => e.Personid).HasColumnName("personid");
            entity.Property(e => e.Tittle)
                .HasMaxLength(100)
                .HasColumnName("tittle");
            entity.Property(e => e.Type)
                .HasMaxLength(50)
                .HasColumnName("type");

            entity.HasOne(d => d.Person).WithMany(p => p.Notifications)
                .HasForeignKey(d => d.Personid)
                .HasConstraintName("notification_personid_fkey");
        });

        modelBuilder.Entity<Offer>(entity =>
        {
            entity.HasKey(e => e.OfferId).HasName("offers_pkey");

            entity.ToTable("offers", "manzili");

            entity.Property(e => e.OfferId).HasColumnName("offer_id");
            entity.Property(e => e.AcceptedAt)
                .HasColumnType("timestamp(6) without time zone")
                .HasColumnName("accepted_at");
            entity.Property(e => e.BuyerComment)
                .HasMaxLength(1000)
                .HasColumnName("buyer_comment");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("timestamp(6) without time zone")
                .HasColumnName("created_at");
            entity.Property(e => e.Description)
                .HasMaxLength(2000)
                .HasColumnName("description");
            entity.Property(e => e.FirstPaidAt)
                .HasColumnType("timestamp(6) without time zone")
                .HasColumnName("first_paid_at");
            entity.Property(e => e.PaidAt)
                .HasColumnType("timestamp(6) without time zone")
                .HasColumnName("paid_at");
            entity.Property(e => e.Price)
                .HasPrecision(12, 2)
                .HasColumnName("price");
            entity.Property(e => e.ProgressUploadedAt)
                .HasColumnType("timestamp(6) without time zone")
                .HasColumnName("progress_uploaded_at");
            entity.Property(e => e.ReadyToShipAt)
                .HasColumnType("timestamp(6) without time zone")
                .HasColumnName("ready_to_ship_at");
            entity.Property(e => e.Requestid).HasColumnName("requestid");
            entity.Property(e => e.SecondPaidAt)
                .HasColumnType("timestamp(6) without time zone")
                .HasColumnName("second_paid_at");
            entity.Property(e => e.SellerComment)
                .HasMaxLength(1000)
                .HasColumnName("seller_comment");
            entity.Property(e => e.Sellerid).HasColumnName("sellerid");
            entity.Property(e => e.Status)
                .HasMaxLength(30)
                .HasDefaultValueSql("'pending'::character varying")
                .HasColumnName("status");
            entity.Property(e => e.UpdatedAt)
                .HasColumnType("timestamp(3) without time zone")
                .HasColumnName("updated_at");

            entity.HasOne(d => d.Request).WithMany(p => p.Offers)
                .HasForeignKey(d => d.Requestid)
                .HasConstraintName("offers_requestid_fkey");

            entity.HasOne(d => d.Seller).WithMany(p => p.Offers)
                .HasForeignKey(d => d.Sellerid)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("offers_sellerid_fkey");
        });

        modelBuilder.Entity<OfferMessage>(entity =>
        {
            entity.HasKey(e => e.MessageId).HasName("offer_messages_pkey");

            entity.ToTable("offer_messages", "manzili");

            entity.Property(e => e.MessageId).HasColumnName("message_id");
            entity.Property(e => e.AuthorId).HasColumnName("author_id");
            entity.Property(e => e.AuthorType)
                .HasMaxLength(10)
                .HasColumnName("author_type");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("timestamp(6) without time zone")
                .HasColumnName("created_at");
            entity.Property(e => e.ImageUrl)
                .HasMaxLength(500)
                .HasColumnName("image_url");
            entity.Property(e => e.OfferId).HasColumnName("offer_id");
            entity.Property(e => e.Text)
                .HasMaxLength(2000)
                .HasColumnName("text");

            entity.HasOne(d => d.Offer).WithMany(p => p.OfferMessages)
                .HasForeignKey(d => d.OfferId)
                .HasConstraintName("offer_messages_offer_id_fkey");
        });

        modelBuilder.Entity<OfferPayment>(entity =>
        {
            entity.HasKey(e => e.PaymentId).HasName("offer_payments_pkey");

            entity.ToTable("offer_payments", "manzili");

            entity.Property(e => e.PaymentId).HasColumnName("payment_id");
            entity.Property(e => e.AddressId).HasColumnName("address_id");
            entity.Property(e => e.Amount)
                .HasPrecision(12, 2)
                .HasColumnName("amount");
            entity.Property(e => e.Milestone)
                .HasMaxLength(20)
                .HasColumnName("milestone");
            entity.Property(e => e.OfferId).HasColumnName("offer_id");
            entity.Property(e => e.PaidAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("timestamp(6) without time zone")
                .HasColumnName("paid_at");
            entity.Property(e => e.PaymentMethod)
                .HasMaxLength(20)
                .HasColumnName("payment_method");

            entity.HasOne(d => d.Address).WithMany(p => p.OfferPayments)
                .HasForeignKey(d => d.AddressId)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("offer_payments_address_id_fkey");

            entity.HasOne(d => d.Offer).WithMany(p => p.OfferPayments)
                .HasForeignKey(d => d.OfferId)
                .HasConstraintName("offer_payments_offer_id_fkey");
        });

        modelBuilder.Entity<Order>(entity =>
        {
            entity.HasKey(e => e.Orderid).HasName("orders_pkey");

            entity.ToTable("orders", "manzili");

            entity.Property(e => e.Orderid).HasColumnName("orderid");
            entity.Property(e => e.AddressId).HasColumnName("address_id");
            entity.Property(e => e.CouponSnapshot)
                .HasColumnType("jsonb")
                .HasColumnName("coupon_snapshot");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("timestamp(6) without time zone")
                .HasColumnName("created_at");
            entity.Property(e => e.Enduserid).HasColumnName("enduserid");
            entity.Property(e => e.IsPaid)
                .HasDefaultValue(false)
                .HasColumnName("is_paid");
            entity.Property(e => e.PaidAt)
                .HasColumnType("timestamp(6) without time zone")
                .HasColumnName("paid_at");
            entity.Property(e => e.Paymentid).HasColumnName("paymentid");
            entity.Property(e => e.Paymentmethod).HasColumnName("paymentmethod");
            entity.Property(e => e.Paymentstatus).HasColumnName("paymentstatus");
            entity.Property(e => e.Psp)
                .HasMaxLength(50)
                .HasColumnName("psp");
            entity.Property(e => e.Sellerid).HasColumnName("sellerid");
            entity.Property(e => e.Shipmentid).HasColumnName("shipmentid");
            entity.Property(e => e.Shippingcost)
                .HasPrecision(10, 2)
                .HasColumnName("shippingcost");
            entity.Property(e => e.Status).HasColumnName("status");
            entity.Property(e => e.StripePaymentIntentId)
                .HasMaxLength(200)
                .HasColumnName("stripe_payment_intent_id");
            entity.Property(e => e.Totalamount)
                .HasPrecision(12, 2)
                .HasColumnName("totalamount");
            entity.Property(e => e.TransactionRef)
                .HasMaxLength(50)
                .HasColumnName("transaction_ref");

            entity.HasOne(d => d.Address).WithMany(p => p.Orders)
                .HasForeignKey(d => d.AddressId)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("orders_address_id_fkey");

            entity.HasOne(d => d.Enduser).WithMany(p => p.Orders)
                .HasForeignKey(d => d.Enduserid)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("orders_enduserid_fkey");

            entity.HasOne(d => d.Seller).WithMany(p => p.Orders)
                .HasForeignKey(d => d.Sellerid)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("orders_sellerid_fkey");

            entity.HasOne(d => d.Shipment).WithMany(p => p.Orders)
                .HasForeignKey(d => d.Shipmentid)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("orders_shipmentid_fkey");
        });

        modelBuilder.Entity<Payout>(entity =>
        {
            entity.HasKey(e => e.Payoutid).HasName("payout_pkey");

            entity.ToTable("payout", "manzili");

            entity.Property(e => e.Payoutid).HasColumnName("payoutid");
            entity.Property(e => e.Amount)
                .HasPrecision(12, 2)
                .HasColumnName("amount");
            entity.Property(e => e.PaidAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("timestamp(6) without time zone")
                .HasColumnName("paid_at");
            entity.Property(e => e.RequestAtTime)
                .HasColumnType("timestamp(6) without time zone")
                .HasColumnName("request_at_time");
            entity.Property(e => e.Sellerid).HasColumnName("sellerid");
            entity.Property(e => e.Status).HasColumnName("status");

            entity.HasOne(d => d.Seller).WithMany(p => p.Payouts)
                .HasForeignKey(d => d.Sellerid)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("payout_sellerid_fkey");
        });

        modelBuilder.Entity<Person>(entity =>
        {
            entity.HasKey(e => e.Personid).HasName("person_pkey");

            entity.ToTable("person", "manzili");

            entity.HasIndex(e => e.Email, "person_email_key").IsUnique();

            entity.Property(e => e.Personid).HasColumnName("personid");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("timestamp(6) without time zone")
                .HasColumnName("created_at");
            entity.Property(e => e.Email)
                .HasMaxLength(100)
                .HasColumnName("email");
            entity.Property(e => e.FirstName)
                .HasMaxLength(50)
                .HasColumnName("first_name");
            entity.Property(e => e.ImageUrl)
                .HasMaxLength(500)
                .HasColumnName("image_url");
            entity.Property(e => e.LastName)
                .HasMaxLength(50)
                .HasColumnName("last_name");
            entity.Property(e => e.Password)
                .HasMaxLength(100)
                .HasColumnName("password");
            entity.Property(e => e.RefreshToken)
                .HasMaxLength(500)
                .HasColumnName("refresh_token");
        });

        modelBuilder.Entity<PersonPermission>(entity =>
        {
            entity.HasKey(e => new { e.Permission, e.Personid }).HasName("person_permissions_pkey");

            entity.ToTable("person_permissions", "manzili");

            entity.Property(e => e.Permission).HasColumnName("permission");
            entity.Property(e => e.Personid).HasColumnName("personid");

            entity.HasOne(d => d.Person).WithMany(p => p.PersonPermissions)
                .HasForeignKey(d => d.Personid)
                .HasConstraintName("person_permissions_personid_fkey");
        });

        modelBuilder.Entity<Product>(entity =>
        {
            entity.HasKey(e => e.Productid).HasName("products_pkey");

            entity.ToTable("products", "manzili");

            entity.Property(e => e.Productid).HasColumnName("productid");
            entity.Property(e => e.Categoryid).HasColumnName("categoryid");
            entity.Property(e => e.Cover).HasColumnName("cover");
            entity.Property(e => e.CoverUrl)
                .HasMaxLength(500)
                .HasColumnName("cover_url");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("timestamp(6) without time zone")
                .HasColumnName("created_at");
            entity.Property(e => e.Description)
                .HasMaxLength(2000)
                .HasColumnName("description");
            entity.Property(e => e.InStock)
                .HasDefaultValue(true)
                .HasColumnName("in_stock");
            entity.Property(e => e.IsDisabled)
                .HasDefaultValue(false)
                .HasColumnName("is_disabled");
            entity.Property(e => e.Mrp)
                .HasPrecision(12, 2)
                .HasColumnName("mrp");
            entity.Property(e => e.Price)
                .HasPrecision(12, 2)
                .HasColumnName("price");
            entity.Property(e => e.Productname)
                .HasMaxLength(100)
                .HasColumnName("productname");
            entity.Property(e => e.Sellerid).HasColumnName("sellerid");
            entity.Property(e => e.ShippingBulkyCategory)
                .HasMaxLength(20)
                .HasColumnName("shipping_bulky_category");
            entity.Property(e => e.ShippingSize)
                .HasMaxLength(20)
                .HasColumnName("shipping_size");
            entity.Property(e => e.Stock)
                .HasDefaultValue(10)
                .HasColumnName("stock");
            entity.Property(e => e.UpdatedAt)
                .HasColumnType("timestamp(3) without time zone")
                .HasColumnName("updated_at");

            entity.HasOne(d => d.Category).WithMany(p => p.Products)
                .HasForeignKey(d => d.Categoryid)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("products_categoryid_fkey");

            entity.HasOne(d => d.Seller).WithMany(p => p.Products)
                .HasForeignKey(d => d.Sellerid)
                .OnDelete(DeleteBehavior.Cascade)
                .HasConstraintName("products_sellerid_fkey");
        });

        modelBuilder.Entity<ProductImage>(entity =>
        {
            entity.HasKey(e => new { e.ProductImageid, e.Productid }).HasName("product_images_pkey");

            entity.ToTable("product_images", "manzili");

            entity.Property(e => e.ProductImageid)
                .ValueGeneratedOnAdd()
                .HasColumnName("product_imageid");
            entity.Property(e => e.Productid).HasColumnName("productid");
            entity.Property(e => e.ImageUrl)
                .HasMaxLength(500)
                .HasColumnName("image_url");
            entity.Property(e => e.Productimage).HasColumnName("productimage");
            entity.Property(e => e.UploadDate)
                .HasDefaultValueSql("CURRENT_DATE")
                .HasColumnName("upload_date");

            entity.HasOne(d => d.Product).WithMany(p => p.ProductImages)
                .HasForeignKey(d => d.Productid)
                .HasConstraintName("product_images_productid_fkey");
        });

        modelBuilder.Entity<ProductVariant>(entity =>
        {
            entity.HasKey(e => e.VariantId).HasName("product_variants_pkey");

            entity.ToTable("product_variants", "manzili");

            entity.Property(e => e.VariantId).HasColumnName("variant_id");
            entity.Property(e => e.Productid).HasColumnName("productid");
            entity.Property(e => e.VariantName)
                .HasMaxLength(100)
                .HasColumnName("variant_name");

            entity.HasOne(d => d.Product).WithMany(p => p.ProductVariants)
                .HasForeignKey(d => d.Productid)
                .HasConstraintName("product_variants_productid_fkey");
        });

        modelBuilder.Entity<ProofAsImage>(entity =>
        {
            entity.HasKey(e => new { e.Imageid, e.Returnid }).HasName("proof_as_images_pkey");

            entity.ToTable("proof_as_images", "manzili");

            entity.Property(e => e.Imageid)
                .ValueGeneratedOnAdd()
                .HasColumnName("imageid");
            entity.Property(e => e.Returnid).HasColumnName("returnid");
            entity.Property(e => e.EvidenceUrl)
                .HasMaxLength(500)
                .HasColumnName("evidence_url");
            entity.Property(e => e.TheImage).HasColumnName("the_image");

            entity.HasOne(d => d.Return).WithMany(p => p.ProofAsImages)
                .HasForeignKey(d => d.Returnid)
                .HasConstraintName("proof_as_images_returnid_fkey");
        });

        modelBuilder.Entity<Report>(entity =>
        {
            entity.HasKey(e => e.ReportId).HasName("reports_pkey");

            entity.ToTable("reports", "manzili");

            entity.Property(e => e.ReportId).HasColumnName("report_id");
            entity.Property(e => e.AdminNote)
                .HasMaxLength(1000)
                .HasColumnName("admin_note");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("timestamp(6) without time zone")
                .HasColumnName("created_at");
            entity.Property(e => e.CustomRequestid).HasColumnName("custom_requestid");
            entity.Property(e => e.Description)
                .HasMaxLength(2000)
                .HasColumnName("description");
            entity.Property(e => e.Productid).HasColumnName("productid");
            entity.Property(e => e.Reason)
                .HasMaxLength(500)
                .HasColumnName("reason");
            entity.Property(e => e.ReporterId).HasColumnName("reporter_id");
            entity.Property(e => e.ResolvedAt)
                .HasColumnType("timestamp(6) without time zone")
                .HasColumnName("resolved_at");
            entity.Property(e => e.Sellerid).HasColumnName("sellerid");
            entity.Property(e => e.Status)
                .HasMaxLength(20)
                .HasDefaultValueSql("'PENDING'::character varying")
                .HasColumnName("status");
            entity.Property(e => e.StoreOrderid).HasColumnName("store_orderid");
            entity.Property(e => e.Type)
                .HasMaxLength(50)
                .HasColumnName("type");
            entity.Property(e => e.UpdatedAt)
                .HasColumnType("timestamp(3) without time zone")
                .HasColumnName("updated_at");

            entity.HasOne(d => d.CustomRequest).WithMany(p => p.Reports)
                .HasForeignKey(d => d.CustomRequestid)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("reports_custom_requestid_fkey");

            entity.HasOne(d => d.Reporter).WithMany(p => p.Reports)
                .HasForeignKey(d => d.ReporterId)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("reports_reporter_id_fkey");

            entity.HasOne(d => d.Seller).WithMany(p => p.Reports)
                .HasForeignKey(d => d.Sellerid)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("reports_sellerid_fkey");
        });

        modelBuilder.Entity<Return>(entity =>
        {
            entity.HasKey(e => e.Returnid).HasName("returns_pkey");

            entity.ToTable("returns", "manzili");

            entity.Property(e => e.Returnid).HasColumnName("returnid");
            entity.Property(e => e.Orderid).HasColumnName("orderid");
            entity.Property(e => e.Reason)
                .HasMaxLength(1000)
                .HasColumnName("reason");
            entity.Property(e => e.RefundAmount)
                .HasPrecision(12, 2)
                .HasColumnName("refund_amount");
            entity.Property(e => e.Requestdate)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("timestamp(6) without time zone")
                .HasColumnName("requestdate");
            entity.Property(e => e.Status).HasColumnName("status");
            entity.Property(e => e.StoreOrderid).HasColumnName("store_orderid");

            entity.HasOne(d => d.Order).WithMany(p => p.Returns)
                .HasForeignKey(d => d.Orderid)
                .HasConstraintName("returns_orderid_fkey");

            entity.HasOne(d => d.StoreOrder).WithMany(p => p.Returns)
                .HasForeignKey(d => d.StoreOrderid)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("returns_store_orderid_fkey");
        });

        modelBuilder.Entity<ReviewingAndRating>(entity =>
        {
            entity.HasKey(e => new { e.Enduserid, e.Productid }).HasName("reviewing_and_rating_pkey");

            entity.ToTable("reviewing_and_rating", "manzili");

            entity.Property(e => e.Enduserid).HasColumnName("enduserid");
            entity.Property(e => e.Productid).HasColumnName("productid");
            entity.Property(e => e.Comment)
                .HasMaxLength(500)
                .HasColumnName("comment");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("timestamp(6) without time zone")
                .HasColumnName("created_at");
            entity.Property(e => e.Orderid).HasColumnName("orderid");
            entity.Property(e => e.Rating).HasColumnName("rating");

            entity.HasOne(d => d.Enduser).WithMany(p => p.ReviewingAndRatings)
                .HasForeignKey(d => d.Enduserid)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("reviewing_and_rating_enduserid_fkey");

            entity.HasOne(d => d.Product).WithMany(p => p.ReviewingAndRatings)
                .HasForeignKey(d => d.Productid)
                .HasConstraintName("reviewing_and_rating_productid_fkey");
        });

        modelBuilder.Entity<Seller>(entity =>
        {
            entity.HasKey(e => e.Sellerid).HasName("seller_pkey");

            entity.ToTable("seller", "manzili");

            entity.HasIndex(e => e.Personid, "seller_personid_key").IsUnique();

            entity.HasIndex(e => e.Username, "seller_username_key").IsUnique();

            entity.Property(e => e.Sellerid).HasColumnName("sellerid");
            entity.Property(e => e.AddressText)
                .HasMaxLength(500)
                .HasColumnName("address_text");
            entity.Property(e => e.BostaPickupLocationId)
                .HasMaxLength(100)
                .HasColumnName("bosta_pickup_location_id");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("timestamp(6) without time zone")
                .HasColumnName("created_at");
            entity.Property(e => e.Email)
                .HasMaxLength(100)
                .HasColumnName("email");
            entity.Property(e => e.IsActive)
                .HasDefaultValue(false)
                .HasColumnName("is_active");
            entity.Property(e => e.LogoUrl)
                .HasMaxLength(500)
                .HasColumnName("logo_url");
            entity.Property(e => e.NationalIdImageUrl)
                .HasMaxLength(500)
                .HasColumnName("national_id_image_url");
            entity.Property(e => e.Personid).HasColumnName("personid");
            entity.Property(e => e.Phone)
                .HasMaxLength(20)
                .HasColumnName("phone");
            entity.Property(e => e.SellerwalletBalance)
                .HasPrecision(12, 2)
                .HasDefaultValue(0.00m)
                .HasColumnName("sellerwallet_balance");
            entity.Property(e => e.StoreDescription).HasColumnName("store_description");
            entity.Property(e => e.StoreStatus)
                .HasMaxLength(20)
                .HasDefaultValueSql("'pending'::character varying")
                .HasColumnName("store_status");
            entity.Property(e => e.Storelogo).HasColumnName("storelogo");
            entity.Property(e => e.Storename)
                .HasMaxLength(100)
                .HasColumnName("storename");
            entity.Property(e => e.UpdatedAt)
                .HasColumnType("timestamp(3) without time zone")
                .HasColumnName("updated_at");
            entity.Property(e => e.Username)
                .HasMaxLength(100)
                .HasColumnName("username");

            entity.HasOne(d => d.Person).WithOne(p => p.Seller)
                .HasForeignKey<Seller>(d => d.Personid)
                .HasConstraintName("seller_personid_fkey");
        });

        modelBuilder.Entity<SellerWallet>(entity =>
        {
            entity.HasKey(e => e.WalletId).HasName("seller_wallet_pkey");

            entity.ToTable("seller_wallet", "manzili");

            entity.HasIndex(e => e.Sellerid, "seller_wallet_sellerid_key").IsUnique();

            entity.Property(e => e.WalletId).HasColumnName("wallet_id");
            entity.Property(e => e.AvailableBalance)
                .HasPrecision(12, 2)
                .HasColumnName("available_balance");
            entity.Property(e => e.BankAccountHolder)
                .HasMaxLength(200)
                .HasColumnName("bank_account_holder");
            entity.Property(e => e.BankLast4)
                .HasMaxLength(4)
                .HasColumnName("bank_last4");
            entity.Property(e => e.BankName)
                .HasMaxLength(100)
                .HasColumnName("bank_name");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("timestamp(6) without time zone")
                .HasColumnName("created_at");
            entity.Property(e => e.Currency)
                .HasMaxLength(10)
                .HasDefaultValueSql("'EGP'::character varying")
                .HasColumnName("currency");
            entity.Property(e => e.PendingBalance)
                .HasPrecision(12, 2)
                .HasColumnName("pending_balance");
            entity.Property(e => e.Sellerid).HasColumnName("sellerid");
            entity.Property(e => e.StripeAccountId)
                .HasMaxLength(100)
                .HasColumnName("stripe_account_id");
            entity.Property(e => e.UpdatedAt)
                .HasColumnType("timestamp(3) without time zone")
                .HasColumnName("updated_at");

            entity.HasOne(d => d.Seller).WithOne(p => p.SellerWallet)
                .HasForeignKey<SellerWallet>(d => d.Sellerid)
                .HasConstraintName("seller_wallet_sellerid_fkey");
        });

        modelBuilder.Entity<Shipment>(entity =>
        {
            entity.HasKey(e => e.Shipmentid).HasName("shipment_pkey");

            entity.ToTable("shipment", "manzili");

            entity.HasIndex(e => e.StoreOrderid, "shipment_store_orderid_key").IsUnique();

            entity.Property(e => e.Shipmentid).HasColumnName("shipmentid");
            entity.Property(e => e.AwbUrl)
                .HasMaxLength(500)
                .HasColumnName("awb_url");
            entity.Property(e => e.BostaDeliveryId)
                .HasMaxLength(100)
                .HasColumnName("bosta_delivery_id");
            entity.Property(e => e.Carrier)
                .HasMaxLength(100)
                .HasColumnName("carrier");
            entity.Property(e => e.CodAmount)
                .HasPrecision(12, 2)
                .HasColumnName("cod_amount");
            entity.Property(e => e.DeliveredAtTime).HasColumnName("delivered_at_time");
            entity.Property(e => e.ShipmentStatus).HasColumnName("shipment_status");
            entity.Property(e => e.ShippedAtTime)
                .HasColumnType("timestamp(6) without time zone")
                .HasColumnName("shipped_at_time");
            entity.Property(e => e.ShippingCost)
                .HasPrecision(10, 2)
                .HasColumnName("shipping_cost");
            entity.Property(e => e.Size)
                .HasMaxLength(20)
                .HasColumnName("size");
            entity.Property(e => e.StatusText)
                .HasMaxLength(30)
                .HasColumnName("status_text");
            entity.Property(e => e.StoreOrderid).HasColumnName("store_orderid");
            entity.Property(e => e.TrackingNumber)
                .HasMaxLength(50)
                .HasColumnName("tracking_number");

            entity.HasOne(d => d.StoreOrder).WithOne(p => p.Shipment)
                .HasForeignKey<Shipment>(d => d.StoreOrderid)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("shipment_store_orderid_fkey");
        });

        modelBuilder.Entity<ShipmentEvent>(entity =>
        {
            entity.HasKey(e => e.EventId).HasName("shipment_events_pkey");

            entity.ToTable("shipment_events", "manzili");

            entity.HasIndex(e => new { e.Shipmentid, e.PayloadHash }, "shipment_events_shipmentid_payload_hash_key").IsUnique();

            entity.Property(e => e.EventId).HasColumnName("event_id");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("timestamp(6) without time zone")
                .HasColumnName("created_at");
            entity.Property(e => e.EventType)
                .HasMaxLength(50)
                .HasColumnName("event_type");
            entity.Property(e => e.OccurredAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("timestamp(6) without time zone")
                .HasColumnName("occurred_at");
            entity.Property(e => e.PayloadHash)
                .HasMaxLength(64)
                .HasColumnName("payload_hash");
            entity.Property(e => e.RawPayload)
                .HasColumnType("jsonb")
                .HasColumnName("raw_payload");
            entity.Property(e => e.Shipmentid).HasColumnName("shipmentid");

            entity.HasOne(d => d.Shipment).WithMany(p => p.ShipmentEvents)
                .HasForeignKey(d => d.Shipmentid)
                .HasConstraintName("shipment_events_shipmentid_fkey");
        });

        modelBuilder.Entity<StandardOrder>(entity =>
        {
            entity.HasKey(e => e.Orderid).HasName("standard_order_pkey");

            entity.ToTable("standard_order", "manzili");

            entity.Property(e => e.Orderid)
                .ValueGeneratedNever()
                .HasColumnName("orderid");

            entity.HasOne(d => d.Order).WithOne(p => p.StandardOrder)
                .HasForeignKey<StandardOrder>(d => d.Orderid)
                .HasConstraintName("standard_order_orderid_fkey");
        });

        modelBuilder.Entity<StoreOrder>(entity =>
        {
            entity.HasKey(e => e.StoreOrderid).HasName("store_orders_pkey");

            entity.ToTable("store_orders", "manzili");

            entity.Property(e => e.StoreOrderid).HasColumnName("store_orderid");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("timestamp(6) without time zone")
                .HasColumnName("created_at");
            entity.Property(e => e.DiscountTotal)
                .HasPrecision(12, 2)
                .HasColumnName("discount_total");
            entity.Property(e => e.IsPaid).HasColumnName("is_paid");
            entity.Property(e => e.Orderid).HasColumnName("orderid");
            entity.Property(e => e.PaymentMethod)
                .HasMaxLength(20)
                .HasColumnName("payment_method");
            entity.Property(e => e.Sellerid).HasColumnName("sellerid");
            entity.Property(e => e.ShippingTotal)
                .HasPrecision(12, 2)
                .HasColumnName("shipping_total");
            entity.Property(e => e.Status)
                .HasMaxLength(30)
                .HasDefaultValueSql("'ORDER_PLACED'::character varying")
                .HasColumnName("status");
            entity.Property(e => e.Subtotal)
                .HasPrecision(12, 2)
                .HasColumnName("subtotal");
            entity.Property(e => e.Total)
                .HasPrecision(12, 2)
                .HasColumnName("total");
            entity.Property(e => e.UpdatedAt)
                .HasColumnType("timestamp(3) without time zone")
                .HasColumnName("updated_at");

            entity.HasOne(d => d.Order).WithMany(p => p.StoreOrders)
                .HasForeignKey(d => d.Orderid)
                .HasConstraintName("store_orders_orderid_fkey");

            entity.HasOne(d => d.Seller).WithMany(p => p.StoreOrders)
                .HasForeignKey(d => d.Sellerid)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("store_orders_sellerid_fkey");
        });

        modelBuilder.Entity<StoreOrderItem>(entity =>
        {
            entity.HasKey(e => e.ItemId).HasName("store_order_items_pkey");

            entity.ToTable("store_order_items", "manzili");

            entity.Property(e => e.ItemId).HasColumnName("item_id");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("timestamp(6) without time zone")
                .HasColumnName("created_at");
            entity.Property(e => e.PriceAtPurchase)
                .HasPrecision(12, 2)
                .HasColumnName("price_at_purchase");
            entity.Property(e => e.ProductImageUrl)
                .HasMaxLength(500)
                .HasColumnName("product_image_url");
            entity.Property(e => e.ProductName)
                .HasMaxLength(100)
                .HasColumnName("product_name");
            entity.Property(e => e.Productid).HasColumnName("productid");
            entity.Property(e => e.Quantity).HasColumnName("quantity");
            entity.Property(e => e.ShippingBulkyCat)
                .HasMaxLength(20)
                .HasColumnName("shipping_bulky_cat");
            entity.Property(e => e.ShippingSize)
                .HasMaxLength(20)
                .HasColumnName("shipping_size");
            entity.Property(e => e.StoreOrderid).HasColumnName("store_orderid");

            entity.HasOne(d => d.Product).WithMany(p => p.StoreOrderItems)
                .HasForeignKey(d => d.Productid)
                .OnDelete(DeleteBehavior.Restrict)
                .HasConstraintName("store_order_items_productid_fkey");

            entity.HasOne(d => d.StoreOrder).WithMany(p => p.StoreOrderItems)
                .HasForeignKey(d => d.StoreOrderid)
                .HasConstraintName("store_order_items_store_orderid_fkey");
        });

        modelBuilder.Entity<StorePickupAddress>(entity =>
        {
            entity.HasKey(e => e.PickupId).HasName("store_pickup_addresses_pkey");

            entity.ToTable("store_pickup_addresses", "manzili");

            // A seller can own several warehouses (the old unique index was dropped).
            entity.HasIndex(e => e.Sellerid, "store_pickup_addresses_sellerid_idx");

            entity.Property(e => e.PickupId).HasColumnName("pickup_id");
            entity.Property(e => e.BostaCityId)
                .HasMaxLength(50)
                .HasColumnName("bosta_city_id");
            entity.Property(e => e.BostaDistrictId)
                .HasMaxLength(50)
                .HasColumnName("bosta_district_id");
            entity.Property(e => e.BostaZoneId)
                .HasMaxLength(50)
                .HasColumnName("bosta_zone_id");
            entity.Property(e => e.City)
                .HasMaxLength(100)
                .HasColumnName("city");
            entity.Property(e => e.ContactName)
                .HasMaxLength(100)
                .HasColumnName("contact_name");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("timestamp(6) without time zone")
                .HasColumnName("created_at");
            entity.Property(e => e.FirstLine)
                .HasMaxLength(200)
                .HasColumnName("first_line");
            entity.Property(e => e.Phone)
                .HasMaxLength(20)
                .HasColumnName("phone");
            entity.Property(e => e.Label)
                .HasMaxLength(120)
                .HasColumnName("label");
            entity.Property(e => e.IsDefault)
                .HasDefaultValue(false)
                .HasColumnName("is_default");
            entity.Property(e => e.Sellerid).HasColumnName("sellerid");
            entity.Property(e => e.UpdatedAt)
                .HasColumnType("timestamp(3) without time zone")
                .HasColumnName("updated_at");

            entity.HasOne(d => d.Seller).WithMany(p => p.StorePickupAddresses)
                .HasForeignKey(d => d.Sellerid)
                .HasConstraintName("store_pickup_addresses_sellerid_fkey");
        });

        modelBuilder.Entity<Systemadmin>(entity =>
        {
            entity.HasKey(e => e.Adminid).HasName("systemadmin_pkey");

            entity.ToTable("systemadmin", "manzili");

            entity.HasIndex(e => e.Personid, "systemadmin_personid_key").IsUnique();

            entity.Property(e => e.Adminid).HasColumnName("adminid");
            entity.Property(e => e.Personid).HasColumnName("personid");
            entity.Property(e => e.Supervisorid).HasColumnName("supervisorid");

            entity.HasOne(d => d.Person).WithOne(p => p.Systemadmin)
                .HasForeignKey<Systemadmin>(d => d.Personid)
                .HasConstraintName("systemadmin_personid_fkey");

            entity.HasOne(d => d.Supervisor).WithMany(p => p.InverseSupervisor)
                .HasForeignKey(d => d.Supervisorid)
                .HasConstraintName("systemadmin_supervisorid_fkey");
        });

        modelBuilder.Entity<UserCoupon>(entity =>
        {
            entity.HasKey(e => e.UsedCouponid).HasName("user_coupons_pkey");

            entity.ToTable("user_coupons", "manzili");

            entity.Property(e => e.UsedCouponid).HasColumnName("used_couponid");
            entity.Property(e => e.Couponid).HasColumnName("couponid");
            entity.Property(e => e.Orderid).HasColumnName("orderid");
            entity.Property(e => e.UsedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("timestamp(6) without time zone")
                .HasColumnName("used_at");
            entity.Property(e => e.Userid).HasColumnName("userid");

            entity.HasOne(d => d.Coupon).WithMany(p => p.UserCoupons)
                .HasForeignKey(d => d.Couponid)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("user_coupons_couponid_fkey");

            entity.HasOne(d => d.Order).WithMany(p => p.UserCoupons)
                .HasForeignKey(d => d.Orderid)
                .HasConstraintName("user_coupons_orderid_fkey");

            entity.HasOne(d => d.User).WithMany(p => p.UserCoupons)
                .HasForeignKey(d => d.Userid)
                .OnDelete(DeleteBehavior.ClientSetNull)
                .HasConstraintName("user_coupons_userid_fkey");
        });

        modelBuilder.Entity<VariantOption>(entity =>
        {
            entity.HasKey(e => e.OptionId).HasName("variant_options_pkey");

            entity.ToTable("variant_options", "manzili");

            entity.Property(e => e.OptionId).HasColumnName("option_id");
            entity.Property(e => e.Stock).HasColumnName("stock");
            entity.Property(e => e.Value)
                .HasMaxLength(100)
                .HasColumnName("value");
            entity.Property(e => e.VariantId).HasColumnName("variant_id");
            entity.Property(e => e.PriceDelta)
                .HasPrecision(12, 2)
                .HasColumnName("price_delta");
            entity.Property(e => e.Swatch)
                .HasMaxLength(20)
                .HasColumnName("swatch");
            entity.Property(e => e.ImageUrl)
                .HasMaxLength(500)
                .HasColumnName("image_url");

            entity.HasOne(d => d.Variant).WithMany(p => p.VariantOptions)
                .HasForeignKey(d => d.VariantId)
                .HasConstraintName("variant_options_variant_id_fkey");
        });

        modelBuilder.Entity<VisualInspiration>(entity =>
        {
            entity.HasKey(e => new { e.Imageid, e.Requestid }).HasName("visual_inspiration_pkey");

            entity.ToTable("visual_inspiration", "manzili");

            entity.Property(e => e.Imageid)
                .ValueGeneratedOnAdd()
                .HasColumnName("imageid");
            entity.Property(e => e.Requestid).HasColumnName("requestid");
            entity.Property(e => e.Imageurl)
                .HasMaxLength(500)
                .HasColumnName("imageurl");
            entity.Property(e => e.TheImage).HasColumnName("the_image");

            entity.HasOne(d => d.Request).WithMany(p => p.VisualInspirations)
                .HasForeignKey(d => d.Requestid)
                .HasConstraintName("visual_inspiration_requestid_fkey");
        });

        modelBuilder.Entity<Voicememo>(entity =>
        {
            entity.HasKey(e => new { e.Recordingid, e.Requestid }).HasName("voicememo_pkey");

            entity.ToTable("voicememo", "manzili");

            entity.Property(e => e.Recordingid)
                .ValueGeneratedOnAdd()
                .HasColumnName("recordingid");
            entity.Property(e => e.Requestid).HasColumnName("requestid");
            entity.Property(e => e.Duration).HasColumnName("duration");
            entity.Property(e => e.Record).HasColumnName("record");
            entity.Property(e => e.SendAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("timestamp(6) without time zone")
                .HasColumnName("send_at");

            entity.HasOne(d => d.Request).WithMany(p => p.Voicememos)
                .HasForeignKey(d => d.Requestid)
                .HasConstraintName("voicememo_requestid_fkey");
        });

        modelBuilder.Entity<WalletTransaction>(entity =>
        {
            entity.HasKey(e => e.TransactionId).HasName("wallet_transactions_pkey");

            entity.ToTable("wallet_transactions", "manzili");

            entity.HasIndex(e => new { e.WalletId, e.IdempotencyKey }, "wallet_transactions_wallet_id_idempotency_key_key").IsUnique();

            entity.Property(e => e.TransactionId).HasColumnName("transaction_id");
            entity.Property(e => e.Amount)
                .HasPrecision(12, 2)
                .HasColumnName("amount");
            entity.Property(e => e.Bucket)
                .HasMaxLength(20)
                .HasColumnName("bucket");
            entity.Property(e => e.CreatedAt)
                .HasDefaultValueSql("CURRENT_TIMESTAMP")
                .HasColumnType("timestamp(6) without time zone")
                .HasColumnName("created_at");
            entity.Property(e => e.Currency)
                .HasMaxLength(10)
                .HasDefaultValueSql("'EGP'::character varying")
                .HasColumnName("currency");
            entity.Property(e => e.IdempotencyKey)
                .HasMaxLength(200)
                .HasColumnName("idempotency_key");
            entity.Property(e => e.Orderid).HasColumnName("orderid");
            entity.Property(e => e.Shipmentid).HasColumnName("shipmentid");
            entity.Property(e => e.StoreOrderid).HasColumnName("store_orderid");
            entity.Property(e => e.Type)
                .HasMaxLength(30)
                .HasColumnName("type");
            entity.Property(e => e.WalletId).HasColumnName("wallet_id");

            entity.HasOne(d => d.StoreOrder).WithMany(p => p.WalletTransactions)
                .HasForeignKey(d => d.StoreOrderid)
                .OnDelete(DeleteBehavior.SetNull)
                .HasConstraintName("wallet_transactions_store_orderid_fkey");

            entity.HasOne(d => d.Wallet).WithMany(p => p.WalletTransactions)
                .HasForeignKey(d => d.WalletId)
                .HasConstraintName("wallet_transactions_wallet_id_fkey");
        });

        modelBuilder.Entity<Wishlist>(entity =>
        {
            entity.HasKey(e => e.Wichlistid).HasName("wishlist_pkey");

            entity.ToTable("wishlist", "manzili");

            entity.Property(e => e.Wichlistid).HasColumnName("wichlistid");
            entity.Property(e => e.Numberofproducts)
                .HasDefaultValue(0)
                .HasColumnName("numberofproducts");

            entity.HasMany(d => d.Products).WithMany(p => p.Wichlists)
                .UsingEntity<Dictionary<string, object>>(
                    "WhishlistContain",
                    r => r.HasOne<Product>().WithMany()
                        .HasForeignKey("Productid")
                        .HasConstraintName("whishlist_contain_productid_fkey"),
                    l => l.HasOne<Wishlist>().WithMany()
                        .HasForeignKey("Wichlistid")
                        .HasConstraintName("whishlist_contain_wichlistid_fkey"),
                    j =>
                    {
                        j.HasKey("Wichlistid", "Productid").HasName("whishlist_contain_pkey");
                        j.ToTable("whishlist_contain", "manzili");
                        j.IndexerProperty<int>("Wichlistid").HasColumnName("wichlistid");
                        j.IndexerProperty<int>("Productid").HasColumnName("productid");
                    });
        });

        OnModelCreatingPartial(modelBuilder);
    }

    partial void OnModelCreatingPartial(ModelBuilder modelBuilder);
}
