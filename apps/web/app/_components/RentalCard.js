import { format, formatDistance, isPast, isToday, parseISO } from "date-fns";
import { Edit2 } from "lucide-react";
import DeleteRental from "./DeleteRental";
import Image from "@/app/_components/AppImage";

export const formatDistanceFromNow = (dateStr) =>
  formatDistance(parseISO(dateStr), new Date(), {
    addSuffix: true,
  }).replace("about ", "");

function RentalCard({ booking }) {
  const {
    id,
    guestId,
    startDate,
    endDate,
    numMonths,
    totalPrice,
    numTenants,
    status,
    created_at,
    properties: { name, image },
  } = booking;

  return (
    <div className="flex border border-secondary-300 rounded-lg shadow-sm">
      <div className="relative h-32 aspect-square">
        <Image
          src={image}
          alt={`House ${name}`}
          className="object-cover border-r border-secondary-300 rounded-l-lg"
        />
      </div>

      <div className="flex-grow px-6 py-3 flex flex-col">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold">
            {numMonths} months in House {name}
          </h3>
          {isPast(new Date(startDate)) ? (
            <span className="bg-secondary-200 text-secondary-900 h-7 px-3 uppercase text-xs font-bold flex items-center rounded-sm">
              past
            </span>
          ) : (
            <span className="bg-secondary-300 text-secondary-900 h-7 px-3 uppercase text-xs font-bold flex items-center rounded-sm">
              upcoming
            </span>
          )}
        </div>

        <p className="text-lg text-secondary-700">
          {format(new Date(startDate), "EEE, MMM dd yyyy")} (
          {isToday(new Date(startDate))
            ? "Today"
            : formatDistanceFromNow(startDate)}
          ) &mdash; {format(new Date(endDate), "EEE, MMM dd yyyy")}
        </p>

        <div className="flex gap-5 mt-auto items-baseline">
          <p className="text-xl font-semibold text-secondary-900">
            ${totalPrice}
          </p>
          <p className="text-secondary-700">&bull;</p>
          <p className="text-lg text-secondary-700">
            {numTenants} tenant{numTenants > 1 && "s"}
          </p>
          <p className="ml-auto text-sm text-secondary-600">
            Booked {format(new Date(created_at), "EEE, MMM dd yyyy, p")}
          </p>
        </div>
      </div>

      <div className="flex flex-col border-l border-secondary-300 w-[100px] rounded-r-lg">
        <a
          href={`/account/rentals/edit/${id}`}
          className="group flex items-center gap-2 uppercase text-xs font-bold text-secondary-700 border-b border-secondary-300 flex-grow px-3 hover:bg-secondary-100 transition-colors hover:text-secondary-900"
        >
          <Edit2 className="h-5 w-5 text-secondary-600 group-hover:text-secondary-800 transition-colors" />
          <span className="mt-1">Edit</span>
        </a>
        <DeleteRental bookingId={id} />
      </div>
    </div>
  );
}

export default RentalCard;
