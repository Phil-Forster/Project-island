param(
    [Parameter(Mandatory = $true)][string]$DllPath,
    [string]$ExpectedSteamId = '',
    [string]$SchemaPath = ''
)

$ErrorActionPreference = 'Stop'

function Emit-Result($value) {
    $value | ConvertTo-Json -Depth 14 -Compress
}

try {
    if (-not (Test-Path -LiteralPath $DllPath)) {
        Emit-Result @{ ok = $false; error = 'steam_api64.dll was not found.'; rows = @(); stats = @(); phase = 'load' }
        exit 2
    }

    # All native Steamworks calls remain inside compiled C#. PowerShell only
    # launches the helper and serialises the result. Keep the source compatible
    # with the compiler shipped with Windows PowerShell 5.1.
    $source = @"
using System;
using System.Collections.Generic;
using System.IO;
using System.Runtime.InteropServices;
using System.Text;

public sealed class SotfSteamStatRow
{
    public string name { get; set; }
    public string type { get; set; }
    public long? intValue { get; set; }
    public double? floatValue { get; set; }
}

public sealed class SotfSteamNearbyStat
{
    public string name { get; set; }
    public string type { get; set; }
    public long? intValue { get; set; }
    public double? floatValue { get; set; }
    public int distance { get; set; }
}

public sealed class SotfSteamAchievementRow
{
    public SotfSteamAchievementRow()
    {
        nearbyStats = new List<SotfSteamNearbyStat>();
    }

    public string name { get; set; }
    public string apiName { get; set; }
    public string description { get; set; }
    public bool? unlocked { get; set; }
    public string unlockedAt { get; set; }
    public object progress { get; set; }
    public double? progressMin { get; set; }
    public double? progressMax { get; set; }
    public string progressLimitType { get; set; }
    public List<SotfSteamNearbyStat> nearbyStats { get; set; }
}

public sealed class SotfSteamReadResult
{
    public SotfSteamReadResult()
    {
        rows = new List<SotfSteamAchievementRow>();
        stats = new List<SotfSteamStatRow>();
    }

    public bool ok { get; set; }
    public List<SotfSteamAchievementRow> rows { get; set; }
    public List<SotfSteamStatRow> stats { get; set; }
    public int count { get; set; }
    public int apiAchievementCount { get; set; }
    public int discoveredStatCount { get; set; }
    public string schemaPath { get; set; }
    public string expectedSteamId { get; set; }
    public string actualSteamId { get; set; }
    public string initMethod { get; set; }
    public string steamUserInterface { get; set; }
    public string userStatsInterface { get; set; }
    public bool requestCurrentStatsAccepted { get; set; }
    public string phase { get; set; }
    public string error { get; set; }
}

internal sealed class SotfSchemaToken
{
    public string text;
    public int offset;
}

public static class SotfSteamReader
{
    [DllImport("kernel32.dll", CharSet = CharSet.Unicode, SetLastError = true)]
    private static extern IntPtr LoadLibraryW(string lpFileName);

    [DllImport("kernel32.dll", CharSet = CharSet.Ansi, SetLastError = true)]
    private static extern IntPtr GetProcAddress(IntPtr hModule, string lpProcName);

    [DllImport("kernel32.dll", SetLastError = true)]
    [return: MarshalAs(UnmanagedType.Bool)]
    private static extern bool FreeLibrary(IntPtr hModule);

    [UnmanagedFunctionPointer(CallingConvention.Cdecl)]
    private delegate byte BoolNoArgsDelegate();

    [UnmanagedFunctionPointer(CallingConvention.Cdecl)]
    private delegate int InitFlatDelegate(IntPtr errorMessage);

    [UnmanagedFunctionPointer(CallingConvention.Cdecl)]
    private delegate void VoidNoArgsDelegate();

    [UnmanagedFunctionPointer(CallingConvention.Cdecl)]
    private delegate IntPtr InterfaceGetterDelegate();

    [UnmanagedFunctionPointer(CallingConvention.Cdecl)]
    private delegate ulong GetSteamIdDelegate(IntPtr self);

    [UnmanagedFunctionPointer(CallingConvention.Cdecl)]
    private delegate byte RequestCurrentStatsDelegate(IntPtr self);

    [UnmanagedFunctionPointer(CallingConvention.Cdecl)]
    private delegate uint GetNumAchievementsDelegate(IntPtr self);

    [UnmanagedFunctionPointer(CallingConvention.Cdecl)]
    private delegate IntPtr GetAchievementNameDelegate(IntPtr self, uint index);

    [UnmanagedFunctionPointer(CallingConvention.Cdecl, CharSet = CharSet.Ansi)]
    private delegate byte GetAchievementDelegate(
        IntPtr self,
        [MarshalAs(UnmanagedType.LPStr)] string name,
        out byte achieved
    );

    [UnmanagedFunctionPointer(CallingConvention.Cdecl, CharSet = CharSet.Ansi)]
    private delegate byte GetAchievementAndUnlockTimeDelegate(
        IntPtr self,
        [MarshalAs(UnmanagedType.LPStr)] string name,
        out byte achieved,
        out uint unlockTime
    );

    [UnmanagedFunctionPointer(CallingConvention.Cdecl, CharSet = CharSet.Ansi)]
    private delegate IntPtr GetAchievementDisplayAttributeDelegate(
        IntPtr self,
        [MarshalAs(UnmanagedType.LPStr)] string name,
        [MarshalAs(UnmanagedType.LPStr)] string key
    );

    [UnmanagedFunctionPointer(CallingConvention.Cdecl, CharSet = CharSet.Ansi)]
    private delegate byte GetStatInt32Delegate(
        IntPtr self,
        [MarshalAs(UnmanagedType.LPStr)] string name,
        out int data
    );

    [UnmanagedFunctionPointer(CallingConvention.Cdecl, CharSet = CharSet.Ansi)]
    private delegate byte GetStatFloatDelegate(
        IntPtr self,
        [MarshalAs(UnmanagedType.LPStr)] string name,
        out float data
    );

    [UnmanagedFunctionPointer(CallingConvention.Cdecl, CharSet = CharSet.Ansi)]
    private delegate byte GetAchievementProgressLimitsInt32Delegate(
        IntPtr self,
        [MarshalAs(UnmanagedType.LPStr)] string name,
        out int minProgress,
        out int maxProgress
    );

    [UnmanagedFunctionPointer(CallingConvention.Cdecl, CharSet = CharSet.Ansi)]
    private delegate byte GetAchievementProgressLimitsFloatDelegate(
        IntPtr self,
        [MarshalAs(UnmanagedType.LPStr)] string name,
        out float minProgress,
        out float maxProgress
    );

    private static string Utf8PtrToString(IntPtr value)
    {
        if (value == IntPtr.Zero) return null;
        int length = 0;
        while (Marshal.ReadByte(value, length) != 0) length++;
        if (length == 0) return String.Empty;
        byte[] bytes = new byte[length];
        Marshal.Copy(value, bytes, 0, length);
        return Encoding.UTF8.GetString(bytes);
    }

    private static IntPtr Proc(IntPtr module, string name)
    {
        return module == IntPtr.Zero ? IntPtr.Zero : GetProcAddress(module, name);
    }

    private static T Fn<T>(IntPtr module, string name) where T : class
    {
        IntPtr proc = Proc(module, name);
        if (proc == IntPtr.Zero) return null;
        return Marshal.GetDelegateForFunctionPointer(proc, typeof(T)) as T;
    }

    private static bool Init(IntPtr module, out string method, out string detail)
    {
        method = null;
        detail = null;

        BoolNoArgsDelegate oldInit = Fn<BoolNoArgsDelegate>(module, "SteamAPI_Init");
        if (oldInit != null)
        {
            method = "SteamAPI_Init";
            bool ok = oldInit() != 0;
            if (!ok) detail = "SteamAPI_Init returned false.";
            return ok;
        }

        InitFlatDelegate flat = Fn<InitFlatDelegate>(module, "SteamAPI_InitFlat");
        if (flat != null)
        {
            method = "SteamAPI_InitFlat";
            IntPtr buffer = Marshal.AllocHGlobal(1024);
            try
            {
                int i;
                for (i = 0; i < 1024; i++) Marshal.WriteByte(buffer, i, 0);
                int result = flat(buffer);
                string message = Utf8PtrToString(buffer);
                if (result == 0) return true;
                detail = "SteamAPI_InitFlat returned " + result.ToString() +
                    (String.IsNullOrWhiteSpace(message) ? "." : ": " + message);
                return false;
            }
            finally
            {
                Marshal.FreeHGlobal(buffer);
            }
        }

        BoolNoArgsDelegate safe = Fn<BoolNoArgsDelegate>(module, "SteamAPI_InitSafe");
        if (safe != null)
        {
            method = "SteamAPI_InitSafe";
            bool ok = safe() != 0;
            if (!ok) detail = "SteamAPI_InitSafe returned false.";
            return ok;
        }

        detail = "No supported Steam initialisation export was found.";
        return false;
    }

    private static IntPtr GetInterface(IntPtr module, string[] exportNames, out string selected)
    {
        selected = null;
        foreach (string exportName in exportNames)
        {
            InterfaceGetterDelegate fn = Fn<InterfaceGetterDelegate>(module, exportName);
            if (fn == null) continue;
            IntPtr value = fn();
            if (value == IntPtr.Zero) continue;
            selected = exportName;
            return value;
        }
        return IntPtr.Zero;
    }

    private static ulong GetSteamId(IntPtr module, IntPtr steamUser)
    {
        GetSteamIdDelegate fn = Fn<GetSteamIdDelegate>(module, "SteamAPI_ISteamUser_GetSteamID");
        if (fn == null || steamUser == IntPtr.Zero) return 0;
        return fn(steamUser);
    }

    private static bool RequestCurrentStats(IntPtr module, IntPtr stats)
    {
        RequestCurrentStatsDelegate fn = Fn<RequestCurrentStatsDelegate>(module, "SteamAPI_ISteamUserStats_RequestCurrentStats");
        return fn != null && stats != IntPtr.Zero && fn(stats) != 0;
    }

    private static uint GetNumAchievements(IntPtr module, IntPtr stats)
    {
        GetNumAchievementsDelegate fn = Fn<GetNumAchievementsDelegate>(module, "SteamAPI_ISteamUserStats_GetNumAchievements");
        return fn == null || stats == IntPtr.Zero ? 0 : fn(stats);
    }

    private static string GetAchievementName(IntPtr module, IntPtr stats, uint index)
    {
        GetAchievementNameDelegate fn = Fn<GetAchievementNameDelegate>(module, "SteamAPI_ISteamUserStats_GetAchievementName");
        if (fn == null || stats == IntPtr.Zero) return null;
        IntPtr value = fn(stats, index);
        return Utf8PtrToString(value);
    }

    private static bool TryGetAchievement(IntPtr module, IntPtr stats, string name, out bool achieved)
    {
        achieved = false;
        GetAchievementDelegate fn = Fn<GetAchievementDelegate>(module, "SteamAPI_ISteamUserStats_GetAchievement");
        if (fn == null || stats == IntPtr.Zero) return false;
        byte raw;
        bool ok = fn(stats, name, out raw) != 0;
        achieved = raw != 0;
        return ok;
    }

    private static bool TryGetAchievementAndUnlockTime(IntPtr module, IntPtr stats, string name, out bool achieved, out uint unlockTime)
    {
        achieved = false;
        unlockTime = 0;
        GetAchievementAndUnlockTimeDelegate fn = Fn<GetAchievementAndUnlockTimeDelegate>(module, "SteamAPI_ISteamUserStats_GetAchievementAndUnlockTime");
        if (fn == null || stats == IntPtr.Zero) return false;
        byte raw;
        bool ok = fn(stats, name, out raw, out unlockTime) != 0;
        achieved = raw != 0;
        return ok;
    }

    private static string GetDisplayAttribute(IntPtr module, IntPtr stats, string name, string key)
    {
        GetAchievementDisplayAttributeDelegate fn = Fn<GetAchievementDisplayAttributeDelegate>(module, "SteamAPI_ISteamUserStats_GetAchievementDisplayAttribute");
        if (fn == null || stats == IntPtr.Zero) return null;
        IntPtr value = fn(stats, name, key);
        return Utf8PtrToString(value);
    }

    private static bool TryGetProgressLimits(IntPtr module, IntPtr stats, string name, out double minValue, out double maxValue, out string limitType)
    {
        minValue = 0;
        maxValue = 0;
        limitType = null;

        GetAchievementProgressLimitsInt32Delegate intFn = Fn<GetAchievementProgressLimitsInt32Delegate>(module, "SteamAPI_ISteamUserStats_GetAchievementProgressLimitsInt32");
        if (intFn != null)
        {
            int minInt;
            int maxInt;
            if (intFn(stats, name, out minInt, out maxInt) != 0)
            {
                minValue = minInt;
                maxValue = maxInt;
                limitType = "int32";
                return true;
            }
        }

        GetAchievementProgressLimitsFloatDelegate floatFn = Fn<GetAchievementProgressLimitsFloatDelegate>(module, "SteamAPI_ISteamUserStats_GetAchievementProgressLimitsFloat");
        if (floatFn != null)
        {
            float minFloat;
            float maxFloat;
            if (floatFn(stats, name, out minFloat, out maxFloat) != 0)
            {
                minValue = minFloat;
                maxValue = maxFloat;
                limitType = "float";
                return true;
            }
        }

        return false;
    }

    private static bool TryGetStat(IntPtr module, IntPtr stats, string name, out SotfSteamStatRow row)
    {
        row = null;
        GetStatInt32Delegate intFn = Fn<GetStatInt32Delegate>(module, "SteamAPI_ISteamUserStats_GetStatInt32");
        if (intFn != null)
        {
            int intValue;
            if (intFn(stats, name, out intValue) != 0)
            {
                row = new SotfSteamStatRow();
                row.name = name;
                row.type = "int32";
                row.intValue = intValue;
                return true;
            }
        }

        GetStatFloatDelegate floatFn = Fn<GetStatFloatDelegate>(module, "SteamAPI_ISteamUserStats_GetStatFloat");
        if (floatFn != null)
        {
            float floatValue;
            if (floatFn(stats, name, out floatValue) != 0)
            {
                row = new SotfSteamStatRow();
                row.name = name;
                row.type = "float";
                row.floatValue = floatValue;
                return true;
            }
        }

        return false;
    }

    private static bool IsSchemaChar(byte value)
    {
        return value >= 32 && value <= 126;
    }

    private static bool LooksLikeApiToken(string value)
    {
        if (String.IsNullOrWhiteSpace(value) || value.Length < 2 || value.Length > 160) return false;
        int useful = 0;
        int i;
        for (i = 0; i < value.Length; i++)
        {
            char c = value[i];
            if (Char.IsLetterOrDigit(c) || c == '_' || c == '-' || c == '.' || c == ':' || c == ' ') useful++;
            else return false;
        }
        return useful == value.Length;
    }

    private static List<SotfSchemaToken> ReadSchemaTokens(string schemaPath)
    {
        List<SotfSchemaToken> tokens = new List<SotfSchemaToken>();
        if (String.IsNullOrWhiteSpace(schemaPath) || !File.Exists(schemaPath)) return tokens;

        byte[] bytes = File.ReadAllBytes(schemaPath);
        int i = 0;
        while (i < bytes.Length)
        {
            if (!IsSchemaChar(bytes[i]))
            {
                i++;
                continue;
            }

            int start = i;
            while (i < bytes.Length && IsSchemaChar(bytes[i]) && (i - start) <= 160) i++;
            int length = i - start;
            if (length >= 2 && length <= 160)
            {
                string text = Encoding.ASCII.GetString(bytes, start, length);
                if (LooksLikeApiToken(text))
                {
                    SotfSchemaToken token = new SotfSchemaToken();
                    token.text = text;
                    token.offset = start;
                    tokens.Add(token);
                }
            }
        }
        return tokens;
    }

    private static List<SotfSteamStatRow> DiscoverStats(IntPtr module, IntPtr stats, List<SotfSchemaToken> tokens)
    {
        List<SotfSteamStatRow> rows = new List<SotfSteamStatRow>();
        Dictionary<string, bool> seen = new Dictionary<string, bool>(StringComparer.Ordinal);
        int attempted = 0;
        foreach (SotfSchemaToken token in tokens)
        {
            if (seen.ContainsKey(token.text)) continue;
            seen[token.text] = true;
            if (attempted >= 12000) break;
            attempted++;

            SotfSteamStatRow row;
            if (TryGetStat(module, stats, token.text, out row) && row != null)
                rows.Add(row);
        }
        return rows;
    }

    private static int MinDistance(List<SotfSchemaToken> tokens, string a, string b)
    {
        int best = Int32.MaxValue;
        List<int> aOffsets = new List<int>();
        List<int> bOffsets = new List<int>();
        foreach (SotfSchemaToken token in tokens)
        {
            if (String.Equals(token.text, a, StringComparison.Ordinal)) aOffsets.Add(token.offset);
            if (String.Equals(token.text, b, StringComparison.Ordinal)) bOffsets.Add(token.offset);
        }
        foreach (int ao in aOffsets)
            foreach (int bo in bOffsets)
            {
                int distance = Math.Abs(ao - bo);
                if (distance < best) best = distance;
            }
        return best;
    }

    private static List<SotfSteamNearbyStat> NearbyStats(string achievementApiName, List<SotfSteamStatRow> stats, List<SotfSchemaToken> tokens)
    {
        List<SotfSteamNearbyStat> nearby = new List<SotfSteamNearbyStat>();
        foreach (SotfSteamStatRow stat in stats)
        {
            int distance = MinDistance(tokens, achievementApiName, stat.name);
            if (distance == Int32.MaxValue || distance > 4096) continue;
            SotfSteamNearbyStat item = new SotfSteamNearbyStat();
            item.name = stat.name;
            item.type = stat.type;
            item.intValue = stat.intValue;
            item.floatValue = stat.floatValue;
            item.distance = distance;
            nearby.Add(item);
        }
        nearby.Sort(delegate(SotfSteamNearbyStat left, SotfSteamNearbyStat right) { return left.distance.CompareTo(right.distance); });
        if (nearby.Count > 16) nearby.RemoveRange(16, nearby.Count - 16);
        return nearby;
    }

    private static void RunCallbacks(IntPtr module)
    {
        VoidNoArgsDelegate fn = Fn<VoidNoArgsDelegate>(module, "SteamAPI_RunCallbacks");
        if (fn != null) fn();
    }

    private static void Shutdown(IntPtr module)
    {
        VoidNoArgsDelegate fn = Fn<VoidNoArgsDelegate>(module, "SteamAPI_Shutdown");
        if (fn != null) fn();
    }

    public static SotfSteamReadResult Read(string dllPath, string expectedSteamId, string schemaPath)
    {
        SotfSteamReadResult result = new SotfSteamReadResult();
        result.expectedSteamId = expectedSteamId ?? "";
        result.schemaPath = schemaPath ?? "";
        result.phase = "load";

        IntPtr module = IntPtr.Zero;
        bool initialised = false;
        try
        {
            module = LoadLibraryW(dllPath);
            if (module == IntPtr.Zero)
            {
                result.error = "Windows could not load steam_api64.dll (Win32 error " + Marshal.GetLastWin32Error().ToString() + ").";
                return result;
            }

            result.phase = "initialise";
            string initMethod;
            string initDetail;
            initialised = Init(module, out initMethod, out initDetail);
            result.initMethod = initMethod;
            if (!initialised)
            {
                result.error = String.IsNullOrWhiteSpace(initDetail)
                    ? "Steam API initialisation failed. Ensure Steam is running and logged in."
                    : initDetail;
                return result;
            }

            result.phase = "steam-user-interface";
            string steamUserExport;
            IntPtr steamUser = GetInterface(module, new string[] {
                "SteamAPI_SteamUser_v025", "SteamAPI_SteamUser_v024", "SteamAPI_SteamUser_v023",
                "SteamAPI_SteamUser_v022", "SteamAPI_SteamUser_v021", "SteamAPI_SteamUser_v020",
                "SteamAPI_SteamUser_v019", "SteamAPI_SteamUser_v018", "SteamAPI_SteamUser_v017"
            }, out steamUserExport);
            result.steamUserInterface = steamUserExport;

            ulong steamId = steamUser == IntPtr.Zero ? 0 : GetSteamId(module, steamUser);
            if (steamId != 0) result.actualSteamId = steamId.ToString();

            if (!String.IsNullOrWhiteSpace(result.expectedSteamId) &&
                !String.IsNullOrWhiteSpace(result.actualSteamId) &&
                !String.Equals(result.expectedSteamId, result.actualSteamId, StringComparison.Ordinal))
            {
                result.error = "Steam is logged in as " + result.actualSteamId +
                    " but the selected save belongs to " + result.expectedSteamId + ".";
                return result;
            }

            result.phase = "user-stats-interface";
            string statsExport;
            IntPtr stats = GetInterface(module, new string[] {
                "SteamAPI_SteamUserStats_v013", "SteamAPI_SteamUserStats_v012", "SteamAPI_SteamUserStats_v011",
                "SteamAPI_SteamUserStats_v010", "SteamAPI_SteamUserStats_v009", "SteamAPI_SteamUserStats_v008"
            }, out statsExport);
            result.userStatsInterface = statsExport;
            if (stats == IntPtr.Zero)
            {
                result.error = "Steam UserStats interface was unavailable.";
                return result;
            }

            result.phase = "request-current-stats";
            result.requestCurrentStatsAccepted = RequestCurrentStats(module, stats);
            int callbackIndex;
            for (callbackIndex = 0; callbackIndex < 30; callbackIndex++)
            {
                RunCallbacks(module);
                System.Threading.Thread.Sleep(100);
            }

            result.phase = "read-schema-stats";
            List<SotfSchemaToken> schemaTokens = ReadSchemaTokens(schemaPath);
            result.stats = DiscoverStats(module, stats, schemaTokens);
            result.discoveredStatCount = result.stats.Count;

            result.phase = "read-achievements";
            uint total = GetNumAchievements(module, stats);
            result.apiAchievementCount = checked((int)total);
            if (total == 0)
            {
                result.error = "Steam returned zero achievements for Sons of the Forest.";
                return result;
            }

            int resolved = 0;
            uint i;
            for (i = 0; i < total; i++)
            {
                string apiName = GetAchievementName(module, stats, i);
                if (String.IsNullOrWhiteSpace(apiName)) continue;

                bool achieved;
                uint unlockTime;
                bool stateOk = TryGetAchievementAndUnlockTime(module, stats, apiName, out achieved, out unlockTime);
                if (!stateOk)
                    stateOk = TryGetAchievement(module, stats, apiName, out achieved);

                string displayName = GetDisplayAttribute(module, stats, apiName, "name");
                if (String.IsNullOrWhiteSpace(displayName)) displayName = apiName;
                string description = GetDisplayAttribute(module, stats, apiName, "desc") ?? "";

                string unlockedAt = null;
                if (achieved && unlockTime > 0)
                {
                    try
                    {
                        DateTimeOffset epoch = new DateTimeOffset(1970, 1, 1, 0, 0, 0, TimeSpan.Zero);
                        unlockedAt = epoch.AddSeconds(unlockTime).ToString("o");
                    }
                    catch { }
                }

                double minProgress;
                double maxProgress;
                string limitType;
                bool hasLimits = TryGetProgressLimits(module, stats, apiName, out minProgress, out maxProgress, out limitType);

                SotfSteamAchievementRow achievementRow = new SotfSteamAchievementRow();
                achievementRow.name = displayName;
                achievementRow.apiName = apiName;
                achievementRow.description = description;
                achievementRow.unlocked = stateOk ? (bool?)achieved : null;
                achievementRow.unlockedAt = unlockedAt;
                achievementRow.progress = null;
                if (hasLimits)
                {
                    achievementRow.progressMin = minProgress;
                    achievementRow.progressMax = maxProgress;
                    achievementRow.progressLimitType = limitType;
                }
                achievementRow.nearbyStats = NearbyStats(apiName, result.stats, schemaTokens);
                result.rows.Add(achievementRow);
                if (stateOk) resolved++;
            }

            result.count = resolved;
            result.ok = resolved == result.apiAchievementCount && result.apiAchievementCount > 0;
            result.phase = "complete";
            if (!result.ok)
                result.error = "Steam returned state for " + resolved.ToString() + " of " + result.apiAchievementCount.ToString() + " local achievements.";
            return result;
        }
        catch (Exception ex)
        {
            result.error = ex.GetType().Name + ": " + ex.Message;
            return result;
        }
        finally
        {
            try { if (initialised && module != IntPtr.Zero) Shutdown(module); } catch { }
            try { if (module != IntPtr.Zero) FreeLibrary(module); } catch { }
        }
    }
}
"@

    Add-Type -TypeDefinition $source -Language CSharp
    $result = [SotfSteamReader]::Read($DllPath, $ExpectedSteamId, $SchemaPath)
    Emit-Result $result
    if (-not $result.ok) { exit 1 }
}
catch {
    Emit-Result @{ ok = $false; error = ($_.Exception.GetType().Name + ': ' + $_.Exception.Message); rows = @(); stats = @(); phase = 'powershell-wrapper' }
    exit 1
}
