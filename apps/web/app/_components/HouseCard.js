import { Users, Home, Percent, MapPin, Bed, CheckCircle } from "lucide-react";
import Image from "@/app/_components/AppImage";
import Link from "@/app/_components/AppLink";
import { Badge } from "antd";

function HouseCard({ property }) {
  const {
    id,
    name,
    address,
    totalUnits,
    occupiedUnits,
    availableUnits,
    occupancyRate,
    unitsByType,
    image,
    owner_name,
  } = property;

  return (
    <div className="bg-white rounded-2xl shadow-lg overflow-hidden hover:shadow-xl transition-all duration-300 transform hover:-translate-y-1 property-card">
      {/* Property Image */}
      <div className="relative h-48 overflow-hidden">
        <Image
          src={image || "/property-placeholder.jpg"}
          alt={name}
          fill
          className="object-cover"
          onError={(e) => {
            e.target.src = "/property-placeholder.jpg";
          }}
        />

        {/* Availability Badge */}
        <div className="absolute top-4 left-4">
          <Badge
            count={availableUnits}
            style={{ backgroundColor: "#16a34a" }}
          />
          <span className="ml-2 px-3 py-1 bg-green-500 text-white text-sm font-medium rounded-full">
            Available
          </span>
        </div>

        {/* Image Overlay */}
        <div className="absolute inset-0 bg-gradient-to-t from-black/30 to-transparent" />
      </div>

      {/* Property Details */}
      <div className="p-6">
        <div className="mb-4">
          <h3 className="text-xl font-bold text-gray-900 mb-2">{name}</h3>
          {address && (
            <div className="flex items-center text-gray-600 text-sm mb-1">
              <MapPin className="w-4 h-4 mr-1" />
              <span>{address}</span>
            </div>
          )}
          {owner_name && (
            <p className="text-sm text-gray-500">Managed by {owner_name}</p>
          )}
        </div>

        {/* Property Stats */}
        <div className="grid grid-cols-3 gap-4 mb-4 p-3 bg-gray-50 rounded-xl">
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <Home className="w-4 h-4 text-blue-600" />
            </div>
            <p className="text-lg font-bold text-gray-900">{totalUnits || 0}</p>
            <p className="text-xs text-gray-500">Total Units</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <Users className="w-4 h-4 text-green-600" />
            </div>
            <p className="text-lg font-bold text-green-600">
              {availableUnits || 0}
            </p>
            <p className="text-xs text-gray-500">Available</p>
          </div>
          <div className="text-center">
            <div className="flex items-center justify-center mb-1">
              <Percent className="w-4 h-4 text-orange-600" />
            </div>
            <p className="text-lg font-bold text-gray-900">
              {occupancyRate || 0}%
            </p>
            <p className="text-xs text-gray-500">Occupied</p>
          </div>
        </div>

        {/* Unit Types Available */}
        {unitsByType && Object.keys(unitsByType).length > 0 && (
          <div className="space-y-3 mb-6">
            <h4 className="font-semibold text-gray-900 text-sm">
              Available Unit Types:
            </h4>
            <div className="space-y-2">
              {Object.entries(unitsByType)
                .filter(([, typeData]) => typeData.available > 0)
                .slice(0, 3) // Show max 3 unit types
                .map(([unitType, typeData]) => (
                  <div
                    key={unitType}
                    className="flex items-center justify-between p-2 bg-blue-50 rounded-lg"
                  >
                    <div className="flex items-center gap-2">
                      <Bed className="w-4 h-4 text-blue-600" />
                      <span className="font-medium text-gray-900 capitalize text-sm">
                        {unitType.replace("-", " ")}
                      </span>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold text-blue-600">
                        {typeData.available} available
                      </p>
                      {typeData.rent > 0 && (
                        <p className="text-xs text-gray-500">
                          KSh {typeData.rent.toLocaleString()}/mo
                        </p>
                      )}
                    </div>
                  </div>
                ))}
            </div>
          </div>
        )}

        {/* Action Button */}
        <Link
          href={`/properties/${id}`}
          className="block w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white text-center font-medium rounded-xl transition-colors duration-200"
        >
          View Details & Photos →
        </Link>
      </div>
    </div>
  );
}

export default HouseCard;
