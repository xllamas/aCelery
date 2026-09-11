import 'package:flutter/material.dart';

import 'src/acelery_runtime.dart';

void main() {
  runApp(const ACeleryApp());
}

class ACeleryApp extends StatelessWidget {
  const ACeleryApp({super.key});

  @override
  Widget build(BuildContext context) {
    return MaterialApp(
      title: 'aCelery',
      theme: ThemeData(
        colorScheme: ColorScheme.fromSeed(seedColor: const Color(0xFF7CB342)),
      ),
      home: const BootScreen(),
    );
  }
}

/// Brings up the bundle and the server, and reports the result.
///
/// This is a stand-in: Phase 2 replaces it with the WebView that loads
/// [ACeleryRuntime.ideUrl]. It exists so Phase 0 and Phase 1 can be verified
/// on a real device.
class BootScreen extends StatefulWidget {
  const BootScreen({super.key});

  @override
  State<BootScreen> createState() => _BootScreenState();
}

class _BootScreenState extends State<BootScreen> {
  late final Future<ACeleryRuntime> _runtime = ACeleryRuntime.start();

  @override
  Widget build(BuildContext context) {
    return Scaffold(
      appBar: AppBar(title: const Text('aCelery')),
      body: Center(
        child: FutureBuilder<ACeleryRuntime>(
          future: _runtime,
          builder: (context, snapshot) {
            if (snapshot.hasError) {
              return Padding(
                padding: const EdgeInsets.all(24),
                child: Text(
                  'Could not start:\n${snapshot.error}',
                  textAlign: TextAlign.center,
                ),
              );
            }
            if (!snapshot.hasData) {
              return const CircularProgressIndicator();
            }
            final runtime = snapshot.data!;
            return Padding(
              padding: const EdgeInsets.all(24),
              child: Column(
                mainAxisSize: MainAxisSize.min,
                children: [
                  const Text('Bundle installed, server running.'),
                  const SizedBox(height: 8),
                  SelectableText('${runtime.ideUrl}'),
                ],
              ),
            );
          },
        ),
      ),
    );
  }
}
