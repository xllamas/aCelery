import 'package:acelery/main.dart';
import 'package:flutter/material.dart';
import 'package:flutter_test/flutter_test.dart';

void main() {
  testWidgets('the boot screen reports progress while starting up',
      (tester) async {
    await tester.pumpWidget(const ACeleryApp());

    // Starting the runtime needs a real documents directory and a bound
    // socket, so in a widget test it stays pending — which is what we assert:
    // the screen shows progress rather than failing to build.
    expect(find.byType(CircularProgressIndicator), findsOneWidget);
  });
}
