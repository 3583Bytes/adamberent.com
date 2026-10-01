using System.Runtime.InteropServices.JavaScript;
using System.Text;
using ArcadeBasic;
using ArcadeBasic.Runtime;

// Required entry point for a WebAssembly app; the worker calls Host.Run directly.
Console.WriteLine("Arcade BASIC host ready");

// Bridges the interpreter to the web worker in src/basic/worker.ts. Every call into
// "host" is synchronous JavaScript running on the worker thread, so INPUT can block
// (Atomics.wait on shared memory) while the page stays responsive.
public static partial class Host
{
    public const int ScreenWidth = 320;
    public const int ScreenHeight = 200;

    [JSImport("write", "host")]
    internal static partial void Write(string text);

    [JSImport("readLine", "host")]
    internal static partial string? ReadLine();

    [JSImport("readKey", "host")]
    internal static partial string ReadKey();

    [JSImport("present", "host")]
    internal static partial void Present([JSMarshalAs<JSType.MemoryView>] Span<int> pixels, int width, int height);

    [JSImport("tone", "host")]
    internal static partial void Tone(double frequencyHz, double soundedSeconds, double silentSeconds);

    [JSExport]
    public static int Run(string source, string name)
    {
        using var stdout = new HostWriter();
        var graphics = new HostGraphics();
        // The interpreter reports runtime errors on Console.Error; show them on screen.
        var previousError = Console.Error;
        Console.SetError(stdout);
        try
        {
            var result = BasicEngine.Run(source, stdout, new HostReader(), name, default, graphics, new HostKeyboard(), new HostAudio());
            stdout.Flush();
            if (graphics.Dirty) graphics.Flush();
            foreach (var d in result.Diagnostics) Write(Summarize(d));
            return result.ExitCode;
        }
        finally
        {
            Console.SetError(previousError);
        }
    }

    // Diagnostics are rendered compiler-style over several lines; on a 64-column
    // screen the message and its location are enough.
    private static string Summarize(string diagnostic)
    {
        var lines = diagnostic.Split('\n');
        var location = lines.FirstOrDefault(l => l.TrimStart().StartsWith("-->", StringComparison.Ordinal))?.Trim();
        return location is null ? lines[0] + "\n" : $"{lines[0]}\n  {location}\n";
    }
}

sealed class HostWriter : TextWriter
{
    private readonly StringBuilder _buffer = new();
    public override Encoding Encoding => Encoding.UTF8;

    public override void Write(char value)
    {
        _buffer.Append(value);
        if (value == '\n' || _buffer.Length > 512) Flush();
    }

    public override void Write(string? value)
    {
        if (value is null) return;
        _buffer.Append(value);
        if (value.Contains('\n') || _buffer.Length > 512) Flush();
    }

    public override void Flush()
    {
        if (_buffer.Length == 0) return;
        Host.Write(_buffer.ToString());
        _buffer.Clear();
    }
}

sealed class HostReader : TextReader
{
    public override string? ReadLine() => Host.ReadLine();
}

sealed class HostKeyboard : IKeyboard
{
    public string ReadKey() => Host.ReadKey();
}

sealed class HostAudio : IAudioDevice
{
    public void Emit(ToneEvent tone) => Host.Tone(tone.FrequencyHz, tone.SoundedSeconds, tone.SilentSeconds);
    public void Flush() { }
}

// Renders with Arcade BASIC's own raster device and ships each finished frame to the page.
sealed class HostGraphics : IGraphicsDevice
{
    private readonly RasterGraphicsDevice _raster = new(Host.ScreenWidth, Host.ScreenHeight);

    public bool Dirty { get; private set; }

    public int MaxColor => _raster.MaxColor;
    public int MaxLineStyle => _raster.MaxLineStyle;
    public int MaxPointStyle => _raster.MaxPointStyle;
    public GfxDeviceSize DeviceSize => _raster.DeviceSize;

    public void Clear() { _raster.Clear(); Dirty = true; }
    public void SetLineStyle(int style) => _raster.SetLineStyle(style);
    public void SetPointStyle(int style) => _raster.SetPointStyle(style);
    public void SetColor(GfxColorTarget target, int colorIndex) => _raster.SetColor(target, colorIndex);
    public void DrawPoints(IReadOnlyList<GfxPoint> points) { _raster.DrawPoints(points); Dirty = true; }
    public void DrawLines(IReadOnlyList<GfxPoint> polyline) { _raster.DrawLines(polyline); Dirty = true; }
    public void FillArea(IReadOnlyList<GfxPoint> polygon) { _raster.FillArea(polygon); Dirty = true; }
    public void DrawText(GfxPoint at, string text) { _raster.DrawText(at, text); Dirty = true; }

    public void Flush()
    {
        if (!Dirty) return;
        Host.Present(_raster.Pixels, _raster.Width, _raster.Height);
        Dirty = false;
    }
}
