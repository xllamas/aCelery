import 'package:flutter/material.dart';

import 'src/acelery_runtime.dart';
import 'src/shell/ide_screen.dart';

void main() {
  WidgetsFlutterBinding.ensureInitialized();
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
      home: const _Boot(),
    );
  }
}

/// Installs the web bundle and starts the server, then hands over to the IDE.
class _Boot extends StatefulWidget {
  const _Boot();

  @override
  State<_Boot> createState() => _BootState();
}

class _BootState extends State<_Boot> {
  late final Future<ACeleryRuntime> _runtime = ACeleryRuntime.start();

  @override
  Widget build(BuildContext context) {
    return FutureBuilder<ACeleryRuntime>(
      future: _runtime,
      builder: (context, snapshot) {
        if (snapshot.hasError) {
          return Scaffold(
            appBar: AppBar(title: const Text('aCelery')),
            body: Center(
              child: Padding(
                padding: const EdgeInsets.all(24),
                child: Text(
                  'Could not start:\n${snapshot.error}',
                  textAlign: TextAlign.center,
                ),
              ),
            ),
          );
        }
        if (!snapshot.hasData) {
          return const Scaffold(
            body: Center(child: CircularProgressIndicator()),
          );
        }
        return IdeScreen(runtime: snapshot.data!);
      },
    );
  }
}
