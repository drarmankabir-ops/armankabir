<?php
/**
 * POST /api/appointments/public_create.php
 * Creates a public appointment or admission request for staff review.
 */

require_once __DIR__ . '/../database.php';
require_once __DIR__ . '/../helpers.php';
require_once __DIR__ . '/../auth/middleware.php';

handleCors();
requireMethod('POST');
checkRateLimit('public_appointment_' . ($_SERVER['REMOTE_ADDR'] ?? 'unknown'), 5, 900);
requireCsrfToken();

$input = getJsonInput();
$missing = validateRequired($input, [
    'booking_type', 'patient_name', 'patient_phone', 'appointment_date',
]);
if ($missing) {
    errorResponse('Missing required booking fields.', 400, ['missing_fields' => $missing]);
}

$bookingType = $input['booking_type'];
if (!in_array($bookingType, ['chamber', 'admitted'], true)) {
    errorResponse('Invalid booking type.', 422);
}

$readText = static function (string $key, int $maxLength, bool $required = false) use ($input): string {
    $value = $input[$key] ?? '';
    if (!is_string($value) && !is_numeric($value)) {
        errorResponse('Invalid field: ' . $key, 422);
    }
    $value = trim((string) $value);
    $length = function_exists('mb_strlen') ? mb_strlen($value) : strlen($value);
    if ($length > $maxLength || ($required && $value === '')) {
        errorResponse('Invalid field: ' . $key, 422);
    }
    return $value;
};

$patientName = $readText('patient_name', 255, true);
$patientPhone = $readText('patient_phone', 50, true);
$doctor = $readText('doctor', 255);
if ($bookingType === 'chamber' && $doctor === '') {
    errorResponse('Choose a doctor for chamber appointments.', 422);
}
$appointmentDate = $readText('appointment_date', 10, true);
$date = DateTimeImmutable::createFromFormat('!Y-m-d', $appointmentDate);
$dateErrors = DateTimeImmutable::getLastErrors();
if (!$date || $date->format('Y-m-d') !== $appointmentDate
    || ($dateErrors !== false && ($dateErrors['warning_count'] || $dateErrors['error_count']))
    || $appointmentDate < date('Y-m-d')) {
    errorResponse('Choose a valid date that is not in the past.', 422);
}

if (!preg_match('/^\+?[0-9(). -]{7,24}$/', $patientPhone)) {
    errorResponse('Enter a valid phone number.', 422);
}

$appointmentTime = $readText('appointment_time', 5);
if ($appointmentTime !== '' && !preg_match('/^(?:[01]\d|2[0-3]):[0-5]\d$/', $appointmentTime)) {
    errorResponse('Enter a valid appointment time.', 422);
}

$details = [
    'booking_type' => $bookingType,
    'doctor' => $doctor,
    'chamber' => $readText('chamber', 255),
    'reason' => $readText('reason', 2000),
    'hospital_name' => $readText('hospital_name', 255),
    'bed_ward_number' => $readText('bed_ward_number', 100),
    'admission_reason' => $readText('admission_reason', 2000),
    'referring_doctor' => $readText('referring_doctor', 255),
];

try {
    $db = Database::getInstance();
    $stmt = $db->prepare(
        'INSERT INTO appointments
            (patient_name, patient_phone, appointment_date, appointment_time, `type`, `status`, chief_complaint, notes, is_public_request, created_by)
         VALUES
            (:patient_name, :patient_phone, :appointment_date, :appointment_time, :type, \'scheduled\', :chief_complaint, :notes, 1, NULL)'
    );
    $stmt->execute([
        ':patient_name' => $patientName,
        ':patient_phone' => $patientPhone,
        ':appointment_date' => $appointmentDate,
        ':appointment_time' => $appointmentTime !== '' ? $appointmentTime : null,
        ':type' => $bookingType === 'admitted' ? 'consultation' : 'regular',
        ':chief_complaint' => $details['reason'] ?: $details['admission_reason'],
        ':notes' => json_encode($details, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES | JSON_THROW_ON_ERROR),
    ]);

    http_response_code(201);
    successResponse(['id' => (int) $db->lastInsertId()], 'Booking request received. Staff will contact you to confirm.');
} catch (Throwable $e) {
    error_log('Public appointment request failed: ' . $e->getMessage());
    errorResponse('Could not submit your request. Please try again.', 500);
}