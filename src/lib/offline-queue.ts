export type OfflineComplaint = {
  category: string;
  urgency: string;
  description: string;
  photo?: File | null;
};

type QueueResponse = { ok: true } | { ok: false; error: string };

export async function queueOfflineComplaint(
  complaint: OfflineComplaint,
  id: string,
): Promise<void> {
  if (!("serviceWorker" in navigator)) {
    throw new Error("Offline saving is not available in this browser.");
  }

  const registration = await navigator.serviceWorker.ready;
  const worker = registration.active;
  if (!worker) throw new Error("Offline saving is not ready yet. Try again shortly.");

  const channel = new MessageChannel();
  const response = new Promise<QueueResponse>((resolve, reject) => {
    const timeout = window.setTimeout(() => {
      channel.port1.close();
      reject(new Error("Could not save this form offline. Please try again."));
    }, 10000);

    channel.port1.onmessage = (event: MessageEvent<QueueResponse>) => {
      window.clearTimeout(timeout);
      channel.port1.close();
      resolve(event.data);
    };
  });

  worker.postMessage(
    {
      type: "QUEUE_FORM_SUBMISSION",
      submission: {
        id,
        url: "/api/forms/complaints",
        method: "POST",
        fields: {
          category: complaint.category,
          urgency: complaint.urgency,
          description: complaint.description,
        },
        photo: complaint.photo ?? null,
      },
    },
    [channel.port2],
  );

  const result = await response;
  if (!result.ok) throw new Error(result.error);
}
