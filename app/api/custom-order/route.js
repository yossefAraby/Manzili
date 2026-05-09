import { NextResponse } from 'next/server';

// Mock data for local development (replace with Prisma when database is ready)
let mockRequests = [
  {
    id: "req_1",
    itemName: "Custom Wooden Coffee Table",
    description: "Looking for a rustic wooden coffee table with metal legs, approximately 120cm x 60cm. Prefer reclaimed wood with a natural finish.",
    images: ["/dummydata/Wooden Key Holder.png"],
    visibility: "open",
    category: "Woodwork",
    quantity: 1,
    size: { length: 120, width: 60, height: 45 },
    material: "Reclaimed wood, metal",
    deliveryDate: "2026-06-15",
    createdAt: "2026-04-28T10:30:00Z",
    user: { name: "Alex Johnson" },
  },
];

export async function POST(request) {
  try {
    const formData = await request.formData();
    
    // Extract form data
    const itemName = formData.get('itemName');
    const description = formData.get('description');
    const visibility = formData.get('visibility');
    const storeId = formData.get('storeId');
    const category = formData.get('category');
    const quantity = formData.get('quantity');
    const material = formData.get('material');
    const deliveryDate = formData.get('deliveryDate');
    const size = formData.get('size');
    const colors = formData.get('colors');
    
    // Create new request object
    const newRequest = {
      id: `req_${Date.now()}`,
      itemName,
      description,
      images: ['/placeholder.png'], // Replace with actual uploaded image URLs
      visibility,
      storeId: storeId || null,
      category: category || null,
      quantity: quantity ? parseInt(quantity) : null,
      material: material || null,
      deliveryDate: deliveryDate || null,
      size: size ? JSON.parse(size) : null,
      colors: colors ? JSON.parse(colors) : null,
      voiceMemoUrl: null,
      createdAt: new Date().toISOString(),
      user: { name: "Current User" },
    };
    
    // Add to mock data
    mockRequests.unshift(newRequest);
    
    return NextResponse.json(
      { 
        success: true, 
        message: 'Custom request created successfully',
        request: newRequest 
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Error creating custom request:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to create custom request',
        error: error.message 
      },
      { status: 500 }
    );
  }
}

export async function GET() {
  try {
    // Return mock data
    return NextResponse.json(
      { 
        success: true, 
        requests: mockRequests 
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('Error fetching custom requests:', error);
    return NextResponse.json(
      { 
        success: false, 
        message: 'Failed to fetch custom requests',
        error: error.message 
      },
      { status: 500 }
    );
  }
}