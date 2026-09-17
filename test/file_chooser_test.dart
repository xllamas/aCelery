@TestOn('vm')
library;

import 'package:acelery/src/shell/file_chooser.dart';
import 'package:file_picker/file_picker.dart';
import 'package:test/test.dart';

/// Which picker answers an `<input type="file">` in the Android WebView
/// (doc/pickers-evaluation.md §2, §3). The accept lists are the shapes the
/// WebView passed in the spike.
void main() {
  ChooserPlan plan(List<String> accept,
          {bool multiple = false, bool capture = false, bool save = false}) =>
      planChooser(
          accept: accept, multiple: multiple, capture: capture, save: save);

  test('images go to the Photo Picker, one or several', () {
    expect(plan(['image/*']), isA<PickImages>());
    expect((plan(['image/*'], multiple: true) as PickImages).multiple, isTrue);
    expect(plan(['.jpg', '.PNG', 'image/webp']), isA<PickImages>(),
        reason: 'extensions and MIME types of images are still images');
  });

  test('capture opens the camera', () {
    expect(plan(['image/*'], capture: true), isA<TakePhoto>());
    expect(plan(['video/*'], capture: true), isA<RecordVideo>());
    expect((plan(['image/*', 'video/*'], capture: true) as PickFiles).type,
        FileType.media, reason: 'no single camera mode takes both');
  });

  test('video, audio and mixed media narrow the document picker', () {
    expect((plan(['video/*']) as PickFiles).type, FileType.video);
    expect((plan(['.mp3', 'audio/wav']) as PickFiles).type, FileType.audio);
    final media = plan(['image/*', '.mp4'], multiple: true) as PickFiles;
    expect(media.type, FileType.media);
    expect(media.multiple, isTrue);
  });

  test('extensions and exact MIME types become an extension filter', () {
    final files = plan(['application/json', '.txt', '.zip']) as PickFiles;
    expect(files.type, FileType.custom);
    expect(files.extensions, unorderedEquals(['json', 'txt', 'zip']));

    final csv = plan(['.csv,text/csv']) as PickFiles;
    expect(csv.extensions, unorderedEquals(['csv']),
        reason: 'one accept string may hold a comma-separated list');
  });

  test('what cannot be written as extensions opens the picker unfiltered', () {
    expect((plan(['text/*']) as PickFiles).type, FileType.any);
    expect((plan(['application/x-made-up']) as PickFiles).type, FileType.any);
    expect((plan([]) as PickFiles).type, FileType.any);
    expect((plan(['', ' ']) as PickFiles).type, FileType.any,
        reason: 'an input with no accept arrives as an empty entry');
  });

  test('a save dialog is not a file input, and gets nothing', () {
    expect(plan(['image/*'], save: true), isA<Unsupported>());
  });
}
