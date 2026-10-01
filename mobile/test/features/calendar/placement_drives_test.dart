import 'package:flutter_test/flutter_test.dart';
import 'package:placement_attendance_mobile/features/calendar/domain/placement_drive_model.dart';

void main() {
  group('PlacementDriveModel Tests', () {
    test('PlacementDriveModel parses JSON correctly with attendanceEnabled OFF', () {
      final json = {
        'id': 'pd-1',
        'companyName': 'TCS Campus Drive',
        'driveDate': '2026-10-20T00:00:00.000Z',
        'venue': 'Main Auditorium',
        'description': 'All India Drive',
        'status': 'UPCOMING',
        'attendanceEnabled': false,
        'createdById': 'staff-1',
        'rounds': [
          {
            'id': 'pdr-1',
            'driveId': 'pd-1',
            'roundName': 'Aptitude Test',
            'roundOrder': 1,
            'venue': 'Lab 1',
          },
        ],
      };

      final drive = PlacementDriveModel.fromJson(json);

      expect(drive.id, equals('pd-1'));
      expect(drive.companyName, equals('TCS Campus Drive'));
      expect(drive.venue, equals('Main Auditorium'));
      expect(drive.status, equals(DriveStatus.upcoming));
      expect(drive.attendanceEnabled, isFalse);
      expect(drive.rounds.length, equals(1));
      expect(drive.rounds.first.roundName, equals('Aptitude Test'));
    });

    test('PlacementDriveModel parses JSON with attendanceEnabled ON', () {
      final json = {
        'id': 'pd-2',
        'companyName': 'Infosys Drive',
        'driveDate': '2026-10-25T00:00:00.000Z',
        'venue': 'Tech Block',
        'status': 'ONGOING',
        'attendanceEnabled': true,
        'createdById': 'staff-1',
        'rounds': [],
      };

      final drive = PlacementDriveModel.fromJson(json);

      expect(drive.companyName, equals('Infosys Drive'));
      expect(drive.status, equals(DriveStatus.ongoing));
      expect(drive.attendanceEnabled, isTrue);
      expect(drive.rounds, isEmpty);
    });
  });
}
