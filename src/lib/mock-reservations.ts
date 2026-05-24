/**
 * Mock Reservation Store
 * 
 * In-memory store for mock reservations during development.
 * ⚠️ NOT persistent - resets on server restart
 * 
 * Used when database is unavailable for fallback testing.
 */

// Type definition for reservation data
interface MockReservationData {
  id: string
  productId: string
  warehouseId: string
  quantity: number
  status: 'PENDING' | 'CONFIRMED' | 'RELEASED'
  expiresAt: Date
  createdAt: Date
  updatedAt: Date
}

// In-memory storage for mock reservations
const mockReservationStore = new Map<string, MockReservationData>()

/**
 * Store a new mock reservation in memory
 * Automatically removes reservation after 15 minutes (cleanup timeout)
 * 
 * @param reservationId - Unique reservation ID
 * @param data - Reservation data to store
 */
export function storeMockReservation(
  reservationId: string,
  data: MockReservationData
): void {
  mockReservationStore.set(reservationId, data)

  // Auto-cleanup: Remove reservation after 15 minutes (matches real DB TTL)
  setTimeout(() => {
    mockReservationStore.delete(reservationId)
  }, 15 * 60 * 1000)
}

/**
 * Retrieve a mock reservation from memory
 * 
 * @param reservationId - Unique reservation ID to retrieve
 * @returns Reservation data if found, undefined otherwise
 */
export function getMockReservation(reservationId: string): MockReservationData | undefined {
  return mockReservationStore.get(reservationId)
}

/**
 * Update an existing mock reservation
 * 
 * @param reservationId - Unique reservation ID to update
 * @param updates - Partial reservation data to merge with existing data
 * @returns Updated reservation data, or null if reservation not found
 */
export function updateMockReservation(
  reservationId: string,
  updates: Partial<MockReservationData>
): MockReservationData | null {
  const existing = mockReservationStore.get(reservationId)

  if (!existing) {
    return null
  }

  // Merge updates with existing data
  const updated: MockReservationData = {
    ...existing,
    ...updates,
    updatedAt: new Date(),
  }

  mockReservationStore.set(reservationId, updated)
  return updated
}
