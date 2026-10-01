import 'package:flutter_test/flutter_test.dart';
import 'package:flutter_riverpod/flutter_riverpod.dart';
import 'package:placement_attendance_mobile/app.dart';

void main() {
  testWidgets('App renders splash screen initially', (WidgetTester tester) async {
    await tester.pumpWidget(
      const ProviderScope(
        child: PlacementApp(),
      ),
    );

    expect(find.byType(PlacementApp), findsOneWidget);
  });
}
