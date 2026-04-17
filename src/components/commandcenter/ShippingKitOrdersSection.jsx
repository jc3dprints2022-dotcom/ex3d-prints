import Shippo from "shippo";

export async function generateShippingKitLabel({ kitOrderId }) {
  try {
    const shippo = new Shippo({
      apiKeyHeader: process.env.SHIPPO_API_KEY,
    });

    const order = await base44.asServiceRole.entities.ShippingKitOrder.get(kitOrderId);

    if (!order) {
      return { error: "Order not found" };
    }

    const user = await base44.asServiceRole.entities.User.get(order.user_id);

    const addr = order.shipping_address?.street
      ? order.shipping_address
      : user?.address;

    if (!addr?.street) {
      return { error: "Missing shipping address" };
    }

    // 1. Create shipment
    const shipment = await shippo.shipments.create({
      addressFrom: {
        name: "EX3D Prints",
        street1: "YOUR ADDRESS",
        city: "YOUR CITY",
        state: "AZ",
        zip: "86301",
        country: "US",
        phone: "+1XXXXXXXXXX",
        email: "you@yourdomain.com",
      },
      addressTo: {
        name: addr.name || user.full_name,
        street1: addr.street,
        city: addr.city,
        state: addr.state,
        zip: addr.zip,
        country: "US",
        phone: user.phone || "+10000000000",
        email: user.email,
      },
      parcels: [
        {
          length: "6",
          width: "6",
          height: "6",
          distanceUnit: "in",
          weight: "1",
          massUnit: "lb",
        },
      ],
      async: false,
    });

    if (!shipment.rates?.length) {
      return { error: "No shipping rates found" };
    }

    const rate = shipment.rates[0];

    // 2. Create transaction (THIS IS WHERE THE FIX IS)
    const transaction = await shippo.transactions.create({
      rate: rate.objectId,

      // 🔥 CRITICAL FIX
      labelFileType: "PDF",

      async: false,
    });

    if (transaction.status !== "SUCCESS") {
      return { error: transaction.messages };
    }

    console.log("FULL TRANSACTION:", transaction);

    // 🔥 fallback safety (some SDKs use snake_case)
    const labelUrl =
      transaction.labelUrl ||
      transaction.label_url ||
      "";

    // 🚨 HARD FAIL if missing (so you catch this immediately)
    if (!labelUrl) {
      return {
        error: "Label created but NO label_url returned",
        debug: transaction,
      };
    }

    // 3. SAVE EVERYTHING
    await base44.asServiceRole.entities.ShippingKitOrder.update(kitOrderId, {
      shipping_label_url: labelUrl,
      tracking_number: transaction.trackingNumber || transaction.tracking_number,
      shippo_transaction_id: transaction.objectId,
      status: "processing",
    });

    return {
      success: true,
      label_url: labelUrl,
      tracking_number: transaction.trackingNumber || transaction.tracking_number,
    };

  } catch (err) {
    console.error("SHIPPO ERROR:", err);
    return { error: "Failed to generate label" };
  }
}