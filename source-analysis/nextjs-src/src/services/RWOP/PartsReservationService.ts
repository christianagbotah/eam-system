import api from '@/lib/api';
import AuditService from './AuditService';

export interface PartReservation {
  id: number;
  workOrderId: number;
  partId: number;
  quantityReserved: number;
  quantityIssued: number;
  reservedBy: number;
  reservedAt: string;
  status: 'reserved' | 'partial_issued' | 'fully_issued' | 'cancelled';
}

export class PartsReservationService {
  
  /**
   * Reserve parts for work order
   */
  async reserveParts(
    workOrderId: number | string,
    partId: number,
    quantity: number,
    userId: number
  ): Promise<PartReservation> {
    // Check availability
    const availability = await this.checkPartAvailability(partId, quantity);
    if (!availability.available) {
      throw new Error(`Insufficient stock. Available: ${availability.availableQuantity}, Required: ${quantity}`);
    }

    try {
      const response = await api.post('/parts/reservations', {
        work_order_id: workOrderId,
        part_id: partId,
        quantity_reserved: quantity,
        reserved_by: userId
      });

      // Log reservation
      await AuditService.logEnforcement(
        'parts_reservation',
        response.data.data.id,
        userId,
        'PARTS_RESERVED',
        {
          work_order_id: workOrderId,
          part_id: partId,
          quantity: quantity,
          timestamp: new Date().toISOString()
        }
      );

      return response.data.data;
    } catch (error) {
      await AuditService.logEnforcement(
        'parts_reservation',
        `${workOrderId}_${partId}`,
        userId,
        'PARTS_RESERVATION_FAILED',
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          part_id: partId,
          quantity: quantity
        }
      );
      throw error;
    }
  }

  /**
   * Issue reserved parts
   */
  async issueParts(
    reservationId: number,
    quantityToIssue: number,
    userId: number
  ): Promise<void> {
    try {
      await api.post(`/parts/reservations/${reservationId}/issue`, {
        quantity_issued: quantityToIssue,
        issued_by: userId,
        issued_at: new Date().toISOString()
      });

      // Log issuance
      await AuditService.logEnforcement(
        'parts_reservation',
        reservationId,
        userId,
        'PARTS_ISSUED',
        {
          quantity_issued: quantityToIssue,
          timestamp: new Date().toISOString()
        }
      );
    } catch (error) {
      await AuditService.logEnforcement(
        'parts_reservation',
        reservationId,
        userId,
        'PARTS_ISSUE_FAILED',
        {
          error: error instanceof Error ? error.message : 'Unknown error',
          quantity_requested: quantityToIssue
        }
      );
      throw error;
    }
  }

  /**
   * Cancel reservation
   */
  async cancelReservation(reservationId: number, userId: number, reason: string): Promise<void> {
    try {
      await api.post(`/parts/reservations/${reservationId}/cancel`, {
        cancelled_by: userId,
        cancellation_reason: reason,
        cancelled_at: new Date().toISOString()
      });

      // Log cancellation
      await AuditService.logEnforcement(
        'parts_reservation',
        reservationId,
        userId,
        'RESERVATION_CANCELLED',
        {
          reason,
          timestamp: new Date().toISOString()
        }
      );
    } catch (error) {
      throw error;
    }
  }

  /**
   * Get work order reservations
   */
  async getWorkOrderReservations(workOrderId: number | string): Promise<PartReservation[]> {
    const response = await api.get(`/work-orders/${workOrderId}/reservations`);
    return response.data.data || [];
  }

  /**
   * Check part availability
   */
  private async checkPartAvailability(partId: number, requiredQuantity: number): Promise<{
    available: boolean;
    availableQuantity: number;
    reservedQuantity: number;
  }> {
    const response = await api.get(`/parts/${partId}/availability`);
    const data = response.data.data;
    
    const availableQuantity = data.stock_quantity - data.reserved_quantity;
    
    return {
      available: availableQuantity >= requiredQuantity,
      availableQuantity,
      reservedQuantity: data.reserved_quantity
    };
  }

  /**
   * Get reservation status summary
   */
  async getReservationSummary(workOrderId: number | string): Promise<{
    totalReservations: number;
    fullyAvailable: boolean;
    partiallyAvailable: number;
    unavailable: number;
  }> {
    const reservations = await this.getWorkOrderReservations(workOrderId);
    
    let fullyAvailable = true;
    let partiallyAvailable = 0;
    let unavailable = 0;

    for (const reservation of reservations) {
      const availability = await this.checkPartAvailability(
        reservation.partId, 
        reservation.quantityReserved - reservation.quantityIssued
      );
      
      if (!availability.available) {
        fullyAvailable = false;
        if (availability.availableQuantity > 0) {
          partiallyAvailable++;
        } else {
          unavailable++;
        }
      }
    }

    return {
      totalReservations: reservations.length,
      fullyAvailable,
      partiallyAvailable,
      unavailable
    };
  }
}

export default new PartsReservationService();