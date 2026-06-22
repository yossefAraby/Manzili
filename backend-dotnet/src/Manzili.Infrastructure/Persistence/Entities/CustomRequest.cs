using System;
using System.Collections.Generic;

namespace Manzili.Infrastructure.Persistence.Entities;

public partial class CustomRequest
{
    public int Requestid { get; set; }

    public string Itemname { get; set; } = null!;

    public string Description { get; set; } = null!;

    public bool Visibility { get; set; }

    public short? Quantity { get; set; }

    public double? Lenght { get; set; }

    public double? Width { get; set; }

    public double? Hight { get; set; }

    public string? Matrial { get; set; }

    public DateOnly? DesiredDeliveryDate { get; set; }

    public DateOnly CreatedAt { get; set; }

    public short? Status { get; set; }

    public int Enduserid { get; set; }

    public short Categoryid { get; set; }

    public int? Sellerid { get; set; }

    public List<string>? ImageUrls { get; set; }

    public string? VoicememoUrl { get; set; }

    public virtual Category Category { get; set; } = null!;

    public virtual ICollection<ColorPalette> ColorPalettes { get; set; } = new List<ColorPalette>();

    public virtual Enduser Enduser { get; set; } = null!;

    public virtual ICollection<Offer> Offers { get; set; } = new List<Offer>();

    public virtual ICollection<Report> Reports { get; set; } = new List<Report>();

    public virtual Seller? Seller { get; set; }

    public virtual ICollection<VisualInspiration> VisualInspirations { get; set; } = new List<VisualInspiration>();

    public virtual ICollection<Voicememo> Voicememos { get; set; } = new List<Voicememo>();
}
